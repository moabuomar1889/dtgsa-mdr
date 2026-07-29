import "server-only"
import { createPrismaClient } from "@dtg/database"

const globalDatabase = globalThis as typeof globalThis & {
  dtgApproveDatabase?: ReturnType<typeof createPrismaClient>
}

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim()
  if (!value && process.env.NEXT_PHASE === "phase-production-build") {
    return "postgresql://build_user@127.0.0.1:5432/dtgsa_build_placeholder"
  }
  if (!value) throw new Error("DATABASE_URL is required for approve-web.")
  return value
}

export const approveDatabase =
  globalDatabase.dtgApproveDatabase ?? createPrismaClient(databaseUrl())

if (process.env.NODE_ENV !== "production") {
  globalDatabase.dtgApproveDatabase = approveDatabase
}

export const prisma = approveDatabase.client
