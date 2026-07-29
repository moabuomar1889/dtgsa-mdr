import { pathToFileURL } from "node:url"
import { hostname } from "node:os"
import { createPrismaClient } from "@dtg/database"
import { createWorkerRuntime } from "./runtime.js"
import { createPrismaJobStore } from "./prisma-job-store.js"
import { createPhase10Handlers } from "./handlers.js"

export { createWorkerRuntime } from "./runtime.js"

function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the durable worker.")
  }
  const { client } = createPrismaClient(databaseUrl)
  const store = createPrismaJobStore(client)
  const handlers = createPhase10Handlers({ prisma: client })
  const runtime = createWorkerRuntime(
    process.env,
    console.log,
    {},
    {
      store,
      handlers,
      workerId: `${hostname()}:${process.pid}`,
      pollMs: Number(process.env.WORKER_POLL_MS ?? 1_000),
      leaseMs: Number(process.env.WORKER_LEASE_MS ?? 30_000),
    }
  )
  runtime.start()

  const shutdown = async (signal: string) => {
    await runtime.stop(signal)
    await client.$disconnect()
  }

  process.once("SIGINT", () => void shutdown("SIGINT"))
  process.once("SIGTERM", () => void shutdown("SIGTERM"))
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
