import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { createReadStream, existsSync } from "node:fs"
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { runtimeRoot } from "./common.mjs"

const qpdfRoot = join(runtimeRoot, "tools", "qpdf")
const artifactRoot = join(runtimeRoot, "artifacts", "qpdf")
await mkdir(artifactRoot, { recursive: true })

async function findExecutable(root) {
  if (!existsSync(root)) return null
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      const found = await findExecutable(path)
      if (found) return found
    } else if (entry.name.toLowerCase() === "qpdf.exe") {
      return path
    }
  }
  return null
}

async function sha256(path) {
  const hash = createHash("sha256")
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest("hex")
}

function execute(executable, args, timeoutMs = 300_000) {
  return new Promise((resolvePromise) => {
    const started = performance.now()
    const child = spawn(executable, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    })
    const output = []
    child.stdout.on("data", (chunk) => output.push(chunk.toString()))
    child.stderr.on("data", (chunk) => output.push(chunk.toString()))
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
          windowsHide: true,
          stdio: "ignore",
        })
      } else {
        child.kill("SIGKILL")
      }
    }, timeoutMs)
    child.once("exit", (code, signal) => {
      clearTimeout(timeout)
      resolvePromise({
        exitCode: code,
        signal,
        timedOut,
        durationMs: Math.round(performance.now() - started),
        output: output.join("").trim().slice(0, 4000),
      })
    })
  })
}

const executable = await findExecutable(qpdfRoot)
if (!executable) {
  const blocked = {
    classification: "BLOCKED_LOCAL_TOOLING",
    reason: "Portable qpdf executable is unavailable.",
  }
  await writeFile(
    join(artifactRoot, "results.json"),
    JSON.stringify(blocked, null, 2)
  )
  console.log(JSON.stringify(blocked, null, 2))
  process.exitCode = 2
} else {
  const fixtureRoot = join(runtimeRoot, "fixtures")
  const small = join(fixtureRoot, "small.pdf")
  const hundred = join(fixtureRoot, "100-mib.pdf")
  const fiveHundred = join(fixtureRoot, "500-mib.pdf")
  const corrupt = join(fixtureRoot, "corrupt.pdf")
  const linearized100 = join(artifactRoot, "100-mib-linearized.pdf")
  const merged500 = join(artifactRoot, "500-mib-merged.pdf")
  const cancelled = join(artifactRoot, "cancelled.pdf")
  const tests = []

  tests.push({
    name: "version",
    ...(await execute(executable, ["--version"])),
  })
  for (const [name, path] of [
    ["check-100-mib", hundred],
    ["check-500-mib", fiveHundred],
  ]) {
    tests.push({ name, ...(await execute(executable, ["--check", path])) })
  }
  tests.push({
    name: "linearize-100-mib",
    ...(await execute(executable, ["--linearize", hundred, linearized100])),
  })
  tests.push({
    name: "merge-500-mib",
    ...(await execute(executable, [
      "--empty",
      "--pages",
      small,
      fiveHundred,
      "--",
      merged500,
    ])),
  })
  tests.push({
    name: "corrupt-input",
    expectedFailure: true,
    ...(await execute(executable, ["--check", corrupt])),
  })
  tests.push({
    name: "cancellation-timeout",
    expectedTimeout: true,
    ...(await execute(executable, ["--linearize", fiveHundred, cancelled], 1)),
  })
  await rm(cancelled, { force: true })

  const outputs = []
  for (const path of [linearized100, merged500]) {
    if (!existsSync(path)) continue
    const file = await stat(path)
    outputs.push({
      file: basename(path),
      sizeBytes: file.size,
      sha256: await sha256(path),
    })
  }
  const passed = tests.every((test) =>
    test.expectedFailure
      ? test.exitCode !== 0
      : test.expectedTimeout
        ? test.timedOut
        : test.exitCode === 0
  )
  const result = {
    classification: passed ? "VERIFIED_LOCAL" : "FAILED",
    executable,
    executableSha256: await sha256(executable),
    installationSource: "https://github.com/qpdf/qpdf/releases/tag/v12.3.2",
    archiveSha256:
      "8941870a604e7c87ed24566b038d46c24ce76616254d2383c578f60c0677f202",
    peakMemory: "NOT_OBSERVED",
    tests,
    outputs,
  }
  await writeFile(
    join(artifactRoot, "results.json"),
    JSON.stringify(result, null, 2)
  )
  console.log(JSON.stringify(result, null, 2))
  if (!passed) process.exitCode = 1
}
