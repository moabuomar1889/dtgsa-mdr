import { spawn } from "node:child_process"
import { closeSync, existsSync, openSync } from "node:fs"
import { mkdir, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import {
  assertWithinRuntime,
  ensureConfig,
  localEnvironment,
  pnpmInvocation,
  repositoryRoot,
  runtimeRoot,
  safeSummary,
  startDatabase,
  statePath,
} from "./common.mjs"

const command = process.argv[2] || "status"

function printSummary(config) {
  const summary = safeSummary(config)
  console.log("DTG Signature Platform local acceptance")
  console.log(
    `Database: ${summary.database.host}:${summary.database.port}/${summary.database.name}`
  )
  console.log("Database password: [REDACTED]")
  for (const [name, url] of Object.entries(summary.urls)) {
    console.log(`${name}: ${url}`)
  }
  console.log(
    "Synthetic users: use the account selector at the acceptance URL."
  )
}

async function run(commandName, args, environment) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(commandName, args, {
      cwd: repositoryRoot,
      env: environment,
      stdio: "inherit",
      windowsHide: true,
    })
    child.once("error", reject)
    child.once("exit", (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(`${commandName} exited with ${code}.`))
    )
  })
}

async function migrateAndSeed(config, seedOnly = false) {
  const environment = localEnvironment(config)
  const runtimeAlreadyRunning = await waitForControl(config, 1)
  const postgres = runtimeAlreadyRunning ? null : await startDatabase(config)
  try {
    if (!seedOnly) {
      const migration = pnpmInvocation(["exec", "prisma", "migrate", "deploy"])
      await run(migration.command, migration.args, environment)
    }
    const foundationSeed = pnpmInvocation([
      "exec",
      "tsx",
      "scripts/seed-foundation.ts",
    ])
    await run(foundationSeed.command, foundationSeed.args, environment)
    const localSeed = pnpmInvocation([
      "exec",
      "tsx",
      "scripts/seed-local-acceptance.ts",
    ])
    await run(localSeed.command, localSeed.args, environment)
  } finally {
    if (postgres) await postgres.stop().catch(() => undefined)
  }
}

async function waitForControl(config, attempts = 120) {
  const url = `http://127.0.0.1:${config.ports.control}/health`
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return true
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000))
  }
  return false
}

async function setup(seedOnly = false) {
  const config = await ensureConfig()
  const environment = localEnvironment(config)
  const nodeMajor = Number(process.versions.node.split(".")[0])
  if (nodeMajor < 24) throw new Error("Local acceptance requires Node.js 24+.")
  const userAgent = process.env.npm_config_user_agent || ""
  if (!userAgent.startsWith("pnpm/11")) {
    throw new Error("Local acceptance requires pnpm 11.")
  }
  const qpdfExpected = join(
    runtimeRoot,
    "tools",
    "qpdf",
    "qpdf-12.3.2-msvc64",
    "bin",
    "qpdf.exe"
  )
  console.log(`Node.js ${process.versions.node}; ${userAgent.split(" ")[0]}.`)
  console.log(
    existsSync(qpdfExpected)
      ? "Portable qpdf 12.3.2 detected."
      : "qpdf: BLOCKED_LOCAL_TOOLING until the documented portable tool is installed."
  )
  if (!seedOnly) {
    await run(
      process.execPath,
      [join(repositoryRoot, "scripts", "local", "generate-fixtures.mjs")],
      environment
    )
  }
  await migrateAndSeed(config, seedOnly)
  printSummary(config)
}

async function up() {
  const config = await ensureConfig()
  if (await waitForControl(config, 1)) {
    printSummary(config)
    return
  }
  await mkdir(join(runtimeRoot, "logs"), { recursive: true })
  const log = openSync(join(runtimeRoot, "logs", "daemon.log"), "a")
  const child = spawn(
    process.execPath,
    [join(repositoryRoot, "scripts", "local", "daemon.mjs")],
    {
      cwd: repositoryRoot,
      env: localEnvironment(config),
      detached: true,
      stdio: ["ignore", log, log],
      windowsHide: true,
    }
  )
  closeSync(log)
  child.unref()
  if (!(await waitForControl(config))) {
    throw new Error(
      `Local runtime did not become ready. Inspect ${join(runtimeRoot, "logs", "daemon.log")}.`
    )
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 2500))
  const state = JSON.parse(await readFile(statePath, "utf8"))
  const failed = Object.entries(state.services || {}).filter(
    ([, service]) => service.status !== "RUNNING"
  )
  if (failed.length) {
    throw new Error(
      `Local services failed readiness: ${failed
        .map(([name, service]) => `${name}=${service.status}`)
        .join(", ")}.`
    )
  }
  printSummary(config)
}

async function status() {
  const config = await ensureConfig()
  const running = await waitForControl(config, 1)
  let state = null
  if (existsSync(statePath)) {
    state = JSON.parse(await readFile(statePath, "utf8"))
  }
  console.log(
    JSON.stringify(
      {
        mode: "LOCAL_ACCEPTANCE",
        runtime: running ? "RUNNING" : "STOPPED",
        ...safeSummary(config),
        state,
      },
      null,
      2
    )
  )
}

async function down() {
  const config = await ensureConfig()
  try {
    const response = await fetch(
      `http://127.0.0.1:${config.ports.control}/stop`,
      { method: "POST" }
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    for (let index = 0; index < 30; index += 1) {
      if (!(await waitForControl(config, 1))) break
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500))
    }
    console.log("Local services stopped; demonstration data was preserved.")
  } catch {
    console.log("Local services are not running.")
  }
}

async function reset() {
  if (!process.argv.includes("--confirm-local-reset")) {
    throw new Error(
      "Reset requires --confirm-local-reset and operates only under .local-runtime."
    )
  }
  await down()
  for (const directory of [
    "postgres",
    "controlled-documents",
    "source-drive",
    "email",
    "webhooks",
    "signing",
  ]) {
    await rm(assertWithinRuntime(join(runtimeRoot, directory)), {
      recursive: true,
      force: true,
    })
  }
  await setup()
}

async function clean() {
  for (const directory of ["temp", "screenshots", "artifacts"]) {
    await rm(assertWithinRuntime(join(runtimeRoot, directory)), {
      recursive: true,
      force: true,
    })
  }
  console.log("Expired local artifacts and report captures were removed.")
}

switch (command) {
  case "setup":
    await setup()
    break
  case "seed":
    await setup(true)
    break
  case "up":
  case "demo":
    await up()
    break
  case "status":
    await status()
    break
  case "down":
    await down()
    break
  case "reset":
    await reset()
    break
  case "clean":
    await clean()
    break
  default:
    throw new Error(`Unsupported local runtime command: ${command}`)
}
