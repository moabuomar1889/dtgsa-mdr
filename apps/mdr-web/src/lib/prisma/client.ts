import "server-only"
import { createPrismaClient, type PrismaClient } from "@dtg/database"
import { env } from "@/lib/config/env"

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient(env.DATABASE_URL, { maxConnections: 3 }).client

// Next.js can evaluate server modules in more than one production bundle.
// Keep one process-wide pool in every environment so those bundles cannot
// independently consume the runtime role's connection allowance.
globalForPrisma.prisma = prisma
