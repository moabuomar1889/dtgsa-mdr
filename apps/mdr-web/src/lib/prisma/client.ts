import "server-only"
import { createPrismaClient, type PrismaClient } from "@dtg/database"
import { env } from "@/lib/config/env"

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient(env.DATABASE_URL).client

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
