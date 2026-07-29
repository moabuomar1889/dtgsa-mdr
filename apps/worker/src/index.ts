import { pathToFileURL } from "node:url"
import { createWorkerRuntime } from "./runtime.js"

export { createWorkerRuntime } from "./runtime.js"

function main() {
  const runtime = createWorkerRuntime()
  runtime.start()
  const keepAlive = setInterval(() => undefined, 60_000)

  const shutdown = (signal: string) => {
    clearInterval(keepAlive)
    runtime.stop(signal)
  }

  process.once("SIGINT", () => shutdown("SIGINT"))
  process.once("SIGTERM", () => shutdown("SIGTERM"))
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
