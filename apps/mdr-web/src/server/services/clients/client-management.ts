import "server-only"
import { AuditSeverity } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"

const createClientSchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(120),
  defaultTimezone: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
})

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function listClients() {
  return prisma.client.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [{ name: "asc" }],
    include: {
      _count: {
        select: {
          contacts: true,
          projects: true,
        },
      },
    },
  })
}

export async function listClientOptions() {
  return prisma.client.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
    },
  })
}

export async function createClient(input: unknown) {
  const parsed = createClientSchema.parse(input)
  const code = normalizeCode(parsed.code)

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        code,
        name: parsed.name.trim(),
        description: parsed.description?.trim() || null,
        defaultTimezone: parsed.defaultTimezone?.trim() || "Asia/Riyadh",
        setting: {
          create: {},
        },
      },
    })

    await tx.auditLog.create({
      data: {
        action: "client.create",
        entityType: "Client",
        entityId: client.id,
        clientId: client.id,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          code: client.code,
          name: client.name,
          defaultTimezone: client.defaultTimezone,
        },
      },
    })

    return client
  })
}
