import { pathToFileURL } from "node:url"
import { writeLog } from "@dtg/observability"
import { apiConfiguration, createPlatformApiServer } from "./server.js"

export async function startPlatformApi() {
  const server = createPlatformApiServer()

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(apiConfiguration.port, () => {
      server.off("error", reject)
      resolve()
    })
  })

  writeLog({
    level: "info",
    event: "service.started",
    application: apiConfiguration.application,
    details: {
      port: apiConfiguration.port,
      build: apiConfiguration.build,
    },
  })

  const stop = async (signal = "internal") => {
    writeLog({
      level: "info",
      event: "service.stopping",
      application: apiConfiguration.application,
      details: { signal },
    })
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    )
  }

  return { server, stop }
}

async function main() {
  const runtime = await startPlatformApi()
  let stopping = false

  const shutdown = async (signal: string) => {
    if (stopping) return
    stopping = true
    await runtime.stop(signal)
  }

  process.once("SIGINT", () => void shutdown("SIGINT"))
  process.once("SIGTERM", () => void shutdown("SIGTERM"))
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void main()
}
