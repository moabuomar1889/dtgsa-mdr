import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

export type DatabaseDiagnostics = {
  host: string
  port: string
  database: string
}

export function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString })
  return {
    adapter,
    client: new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }),
  }
}

export function redactDatabaseConnection(
  connectionString: string
): DatabaseDiagnostics {
  const url = new URL(connectionString)
  return {
    host: url.hostname,
    port: url.port || "5432",
    database: url.pathname.replace(/^\//, ""),
  }
}

export async function probeDatabase(client: PrismaClient) {
  await client.$queryRaw`SELECT 1`
  return true
}

export type { PrismaClient }
