import "server-only"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { env } from "@/lib/config/env"

const globalForPrisma = globalThis as typeof globalThis & {
  prismaAdapter?: PrismaPg
  prisma?: PrismaClient
}

const prismaAdapter =
  globalForPrisma.prismaAdapter ??
  new PrismaPg({
    connectionString: env.DATABASE_URL,
  })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: prismaAdapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaAdapter = prismaAdapter
  globalForPrisma.prisma = prisma
}
