import { createPrismaClient, type PrismaClient } from "@dtg/database"

const globalForPrisma = globalThis as typeof globalThis & {
  verificationPrisma?: PrismaClient
}

function databaseUrl() {
  const value = process.env.DATABASE_URL
  if (!value) throw new Error("DATABASE_URL is required for verification.")
  return value
}

function getPrisma() {
  if (!globalForPrisma.verificationPrisma) {
    globalForPrisma.verificationPrisma =
      createPrismaClient(databaseUrl()).client
  }
  return globalForPrisma.verificationPrisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma() as unknown as Record<PropertyKey, unknown>
    const value = client[property]
    return typeof value === "function" ? value.bind(client) : value
  },
})
