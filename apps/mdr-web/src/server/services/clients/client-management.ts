import "server-only"
import { AuditSeverity, Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"

const createClientSchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(120),
  defaultTimezone: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
})

const updateClientPreferencesSchema = z.object({
  clientId: z.string().trim().min(1),
  defaultTimezone: z.string().trim().min(2).max(100),
  defaultUploadMaxMb: z.coerce.number().int().min(1).max(2048),
  defaultTransmittalMaxMb: z.coerce.number().int().min(1).max(4096),
  defaultResponseDays: z.coerce.number().int().min(1).max(365),
  defaultTransmittalPurpose: z.string().trim().max(160).optional(),
  requireClientCover: z.boolean(),
  includeDtgsaCover: z.boolean(),
})

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {}
}

export async function listClients() {
  return prisma.client.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [{ name: "asc" }],
    include: {
      setting: true,
      _count: {
        select: {
          contacts: true,
          projects: true,
          coverSheetTemplates: true,
        },
      },
    },
  })
}

export async function getClientWorkspace(clientId: string) {
  const [client, coverRules] = await Promise.all([
    prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      include: {
        setting: true,
        contacts: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }],
        },
        projects: {
          where: { deletedAt: null },
          orderBy: { code: "asc" },
          select: { id: true, code: true, name: true, isActive: true },
        },
        coverSheetTemplates: {
          where: { deletedAt: null, isActive: true },
          orderBy: [{ kind: "asc" }, { version: "desc" }],
        },
      },
    }),
    prisma.coverTemplateInheritanceRule.findMany({
      where: { scopeType: "CLIENT", scopeId: clientId, isActive: true },
      orderBy: { priority: "desc" },
    }),
  ])

  if (!client) return null

  const visualVersions =
    coverRules.length > 0
      ? await prisma.coverTemplateVersion.findMany({
          where: {
            templateId: { in: coverRules.map((rule) => rule.templateId) },
          },
          include: { template: { select: { code: true, name: true } } },
          orderBy: [{ createdAt: "desc" }],
        })
      : []

  return { client, visualVersions }
}

export async function updateClientPreferences(input: unknown) {
  const parsed = updateClientPreferencesSchema.parse(input)

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findFirst({
      where: { id: parsed.clientId, deletedAt: null },
      include: { setting: true },
    })
    if (!client) throw new Error("The selected client could not be found.")

    const settings = {
      ...jsonObject(client.setting?.settings),
      defaultResponseDays: parsed.defaultResponseDays,
      defaultTransmittalPurpose:
        parsed.defaultTransmittalPurpose?.trim() || "Issued for review",
    }
    const templateSettings = {
      ...jsonObject(client.setting?.templateSettings),
      requireClientCover: parsed.requireClientCover,
      includeDtgsaCover: parsed.includeDtgsaCover,
      visualCoversClientScoped: true,
    }

    await tx.client.update({
      where: { id: client.id },
      data: { defaultTimezone: parsed.defaultTimezone },
    })
    const savedSetting = await tx.clientSetting.upsert({
      where: { clientId: client.id },
      create: {
        clientId: client.id,
        defaultUploadMaxMb: parsed.defaultUploadMaxMb,
        defaultTransmittalMaxMb: parsed.defaultTransmittalMaxMb,
        settings: settings as Prisma.InputJsonValue,
        templateSettings: templateSettings as Prisma.InputJsonValue,
      },
      update: {
        defaultUploadMaxMb: parsed.defaultUploadMaxMb,
        defaultTransmittalMaxMb: parsed.defaultTransmittalMaxMb,
        settings: settings as Prisma.InputJsonValue,
        templateSettings: templateSettings as Prisma.InputJsonValue,
      },
    })
    await tx.auditLog.create({
      data: {
        action: "client.preferences.update",
        entityType: "ClientSetting",
        entityId: savedSetting.id,
        clientId: client.id,
        severity: AuditSeverity.Info,
        beforeSnapshot: {
          defaultTimezone: client.defaultTimezone,
          defaultUploadMaxMb: client.setting?.defaultUploadMaxMb ?? null,
          defaultTransmittalMaxMb:
            client.setting?.defaultTransmittalMaxMb ?? null,
          settings: client.setting?.settings ?? null,
          templateSettings: client.setting?.templateSettings ?? null,
        },
        afterSnapshot: {
          defaultTimezone: parsed.defaultTimezone,
          defaultUploadMaxMb: parsed.defaultUploadMaxMb,
          defaultTransmittalMaxMb: parsed.defaultTransmittalMaxMb,
          settings,
          templateSettings,
        },
      },
    })
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
