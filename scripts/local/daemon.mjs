import { spawn } from "node:child_process"
import { createServer } from "node:http"
import { closeSync, openSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import {
  ensureConfig,
  host,
  localEnvironment,
  pnpmInvocation,
  portAvailable,
  repositoryRoot,
  runtimeRoot,
  safeSummary,
  startDatabase,
  writeSafeState,
} from "./common.mjs"

const config = await ensureConfig()
const requiredPorts = Object.values(config.ports)
for (const port of requiredPorts) {
  if (!(await portAvailable(port))) {
    throw new Error(`Local port ${port} is already occupied.`)
  }
}

const startedAt = new Date().toISOString()
const logsRoot = join(runtimeRoot, "logs")
await mkdir(logsRoot, { recursive: true })
const children = new Map()
let postgres
let stopping = false

function startChild(name, command, args, environment) {
  const output = openSync(join(logsRoot, `${name}.log`), "a")
  const child = spawn(command, args, {
    cwd: repositoryRoot,
    env: environment,
    stdio: ["ignore", output, output],
    windowsHide: true,
  })
  closeSync(output)
  children.set(name, child)
  child.once("exit", (code, signal) => {
    if (!stopping) {
      void writeState(name, `EXITED_${code ?? signal ?? "UNKNOWN"}`)
    }
  })
  return child
}

async function writeState(changedName, changedStatus) {
  const services = Object.fromEntries(
    [...children].map(([name, child]) => [
      name,
      {
        pid: child.pid,
        status:
          name === changedName
            ? changedStatus
            : child.exitCode === null
              ? "RUNNING"
              : `EXITED_${child.exitCode}`,
      },
    ])
  )
  const urls = safeSummary(config).urls
  for (const [name, url] of Object.entries(urls)) {
    if (services[name]) services[name].url = url
  }
  await writeSafeState({
    mode: "LOCAL_ACCEPTANCE",
    host,
    daemonPid: process.pid,
    startedAt,
    database: {
      status: postgres ? "RUNNING" : "STARTING",
      host,
      port: config.database.port,
      name: config.database.name,
    },
    services,
    urls,
  })
}

async function stop() {
  if (stopping) return
  stopping = true
  await Promise.all(
    [...children.values()].map(
      (child) =>
        new Promise((resolvePromise) => {
          if (child.exitCode !== null) return resolvePromise()
          child.once("exit", resolvePromise)
          if (process.platform === "win32") {
            spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
              windowsHide: true,
              stdio: "ignore",
            })
          } else {
            child.kill("SIGTERM")
          }
          setTimeout(resolvePromise, 8000)
        })
    )
  )
  if (postgres) await postgres.stop().catch(() => undefined)
  await writeSafeState({
    mode: "LOCAL_ACCEPTANCE",
    stoppedAt: new Date().toISOString(),
    database: { status: "STOPPED" },
    services: {},
    urls: safeSummary(config).urls,
  })
  control.close(() => process.exit(0))
}

postgres = await startDatabase(config)
const environment = localEnvironment(config)
const node = process.execPath
const mdrCommand = pnpmInvocation([
  "--dir",
  "apps/mdr-web",
  "exec",
  "next",
  "dev",
  "--hostname",
  host,
  "--port",
  String(config.ports.mdr),
])
startChild("mdr", mdrCommand.command, mdrCommand.args, {
  ...environment,
  PORT: String(config.ports.mdr),
})
const approveCommand = pnpmInvocation([
  "--dir",
  "apps/approve-web",
  "exec",
  "next",
  "dev",
  "--hostname",
  host,
  "--port",
  String(config.ports.approve),
])
startChild("approve", approveCommand.command, approveCommand.args, {
  ...environment,
  PORT: String(config.ports.approve),
})
const verifyCommand = pnpmInvocation([
  "--dir",
  "apps/verify-web",
  "exec",
  "next",
  "dev",
  "--hostname",
  host,
  "--port",
  String(config.ports.verify),
])
startChild("verify", verifyCommand.command, verifyCommand.args, {
  ...environment,
  PORT: String(config.ports.verify),
})
const apiCommand = pnpmInvocation(["--filter", "@dtg/platform-api", "start"])
startChild("api", apiCommand.command, apiCommand.args, {
  ...environment,
  PORT: String(config.ports.api),
})
const workerCommand = pnpmInvocation(["--filter", "@dtg/worker", "start"])
startChild("worker", workerCommand.command, workerCommand.args, {
  ...environment,
  NODE_OPTIONS: [environment.NODE_OPTIONS, "--conditions=react-server"]
    .filter(Boolean)
    .join(" "),
})
startChild(
  "email",
  node,
  [join(repositoryRoot, "scripts", "local", "support-service.mjs")],
  { ...environment, LOCAL_EMAIL_PORT: String(config.ports.email) }
)

const control = createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/stop") {
    response.writeHead(202, { "content-type": "application/json" })
    response.end(JSON.stringify({ stopping: true }))
    setTimeout(() => void stop(), 25)
    return
  }
  if (request.method === "GET" && ["/health", "/state"].includes(request.url)) {
    response.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    })
    response.end(
      JSON.stringify({
        status: "ok",
        mode: "LOCAL_ACCEPTANCE",
        pid: process.pid,
        startedAt,
      })
    )
    return
  }
  response.writeHead(404)
  response.end()
})
control.listen(config.ports.control, host)

await writeState()
process.once("SIGINT", () => void stop())
process.once("SIGTERM", () => void stop())
