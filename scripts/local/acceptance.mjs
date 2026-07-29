import { spawn } from "node:child_process"
import { cpus, freemem, hostname, platform, release, totalmem } from "node:os"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  ensureConfig,
  pnpmInvocation,
  repositoryRoot,
  runtimeRoot,
  safeSummary,
} from "./common.mjs"

const config = await ensureConfig()
const artifactRoot = join(runtimeRoot, "artifacts")
await mkdir(artifactRoot, { recursive: true })

function execute(label, invocation, environment = process.env) {
  return new Promise((resolvePromise, reject) => {
    const started = performance.now()
    const child = spawn(invocation.command, invocation.args, {
      cwd: repositoryRoot,
      env: environment,
      stdio: "inherit",
      windowsHide: true,
    })
    child.once("error", reject)
    child.once("exit", (code) => {
      const result = {
        label,
        exitCode: code,
        durationMs: Math.round(performance.now() - started),
      }
      if (code === 0) resolvePromise(result)
      else
        reject(
          Object.assign(new Error(`${label} failed with ${code}.`), { result })
        )
    })
  })
}

async function timedRequest(url) {
  const started = performance.now()
  const response = await fetch(url, { redirect: "manual" })
  return {
    url,
    status: response.status,
    durationMs: Math.round(performance.now() - started),
    contentType: response.headers.get("content-type"),
  }
}

const summary = safeSummary(config)
const healthUrls = [
  `${summary.urls.mdr}/local-acceptance`,
  `${summary.urls.approve}/api/ready`,
  `${summary.urls.verify}/api/ready`,
  `${summary.urls.api}/ready`,
  `${summary.urls.email}/health`,
]
const health = []
for (const url of healthUrls) health.push(await timedRequest(url))
if (health.some((item) => item.status !== 200)) {
  throw new Error("All local services must be running before acceptance.")
}

const commands = []
commands.push(
  await execute(
    "local provider tests",
    pnpmInvocation([
      "exec",
      "tsx",
      "--conditions=react-server",
      "--test",
      "--test-concurrency=1",
      "tests/unit/phase-16l-local-acceptance.test.ts",
    ])
  )
)
commands.push(
  await execute(
    "browser E2E",
    pnpmInvocation([
      "playwright",
      "test",
      "--config",
      "playwright.local.config.ts",
    ])
  )
)
commands.push(
  await execute("qpdf acceptance", {
    command: process.execPath,
    args: [join(repositoryRoot, "scripts", "local", "qpdf-acceptance.mjs")],
  })
)
commands.push(
  await execute("backup and restore", {
    command: process.execPath,
    args: [join(repositoryRoot, "scripts", "local", "backup-restore.mjs")],
  })
)

const concurrentStarted = performance.now()
const concurrent = await Promise.all(
  Array.from({ length: 20 }, () =>
    fetch(`${summary.urls.mdr}/local-acceptance`).then((response) =>
      response.arrayBuffer().then(() => response.status)
    )
  )
)
const qpdf = JSON.parse(
  await readFile(join(artifactRoot, "qpdf", "results.json"), "utf8")
)
const backup = JSON.parse(
  await readFile(join(runtimeRoot, "backups", "latest-result.json"), "utf8")
)
const playwright = JSON.parse(
  await readFile(join(artifactRoot, "playwright-results.json"), "utf8")
)

const result = {
  classification: "VERIFIED_LOCAL_E2E",
  completedAt: new Date().toISOString(),
  externalProvidersContacted: false,
  serverDeploymentStarted: false,
  health,
  commands,
  browser: {
    expected: playwright.stats.expected,
    unexpected: playwright.stats.unexpected,
    durationMs: playwright.stats.duration,
  },
  qpdf,
  backup,
  performance: {
    concurrentDashboardRequests: concurrent.length,
    concurrentDashboardSuccesses: concurrent.filter((status) => status === 200)
      .length,
    concurrentDashboardDurationMs: Math.round(
      performance.now() - concurrentStarted
    ),
    note: "Local measurements do not represent production capacity.",
  },
  hardware: {
    hostname: hostname(),
    platform: platform(),
    release: release(),
    cpu: cpus()[0]?.model,
    logicalCpuCount: cpus().length,
    totalMemoryBytes: totalmem(),
    freeMemoryBytesAtReport: freemem(),
  },
}
await writeFile(
  join(artifactRoot, "local-acceptance-results.json"),
  JSON.stringify(result, null, 2)
)
console.log(JSON.stringify(result, null, 2))
