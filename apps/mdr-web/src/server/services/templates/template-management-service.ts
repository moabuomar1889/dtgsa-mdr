import "server-only"
import {
  CoverSheetKind,
  ScopeLevel,
} from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"
import {
  buildStorageKey,
  uploadFileToStorage,
} from "@/server/services/storage/storage-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const baseTemplateSchema = z.object({
  scope: z.enum(["global", "client", "project"]),
  clientId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().max(500).optional(),
  isDefault: z.boolean().default(false),
})

const coverTemplateSchema = baseTemplateSchema.extend({
  kind: z.nativeEnum(CoverSheetKind),
})

const transmittalTemplateSchema = baseTemplateSchema

function resolveScopeFields(input: {
  scope: "global" | "client" | "project"
  clientId?: string
  projectId?: string
}) {
  if (input.scope === "project") {
    if (!input.projectId) {
      throw new Error("A project must be selected for a project-scoped template.")
    }

    return {
      scopeLevel: ScopeLevel.Project,
      scopeKey: input.projectId,
      clientId: input.clientId || null,
      projectId: input.projectId,
    }
  }

  if (input.scope === "client") {
    if (!input.clientId) {
      throw new Error("A client must be selected for a client-scoped template.")
    }

    return {
      scopeLevel: ScopeLevel.Client,
      scopeKey: input.clientId,
      clientId: input.clientId,
      projectId: null,
    }
  }

  return {
    scopeLevel: ScopeLevel.Global,
    scopeKey: "system",
    clientId: null,
    projectId: null,
  }
}

async function getNextVersion(input: {
  model: "cover" | "transmittal"
  clientId: string | null
  projectId: string | null
  name: string
  kind?: CoverSheetKind
}) {
  if (input.model === "cover") {
    const count = await prisma.coverSheetTemplate.count({
      where: {
        deletedAt: null,
        clientId: input.clientId,
        projectId: input.projectId,
        name: input.name,
        kind: input.kind,
      },
    })

    return count + 1
  }

  const count = await prisma.transmittalTemplate.count({
    where: {
      deletedAt: null,
      clientId: input.clientId,
      projectId: input.projectId,
      name: input.name,
    },
  })

  return count + 1
}

async function buildTemplatePageOptions() {
  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),
    prisma.project.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        clientId: true,
      },
    }),
  ])

  return {
    clients,
    projects,
  }
}

export async function getTemplateManagementOverview() {
  const [options, coverTemplates, transmittalTemplates] = await Promise.all([
    buildTemplatePageOptions(),
    prisma.coverSheetTemplate.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        client: {
          select: {
            code: true,
            name: true,
          },
        },
        project: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    }),
    prisma.transmittalTemplate.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        client: {
          select: {
            code: true,
            name: true,
          },
        },
        project: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    }),
  ])

  return {
    ...options,
    coverTemplates: await Promise.all(
      coverTemplates.map(async (template) => ({
        ...template,
        fileUrl: template.providerKey
          ? `/api/templates/cover/${template.id}`
          : null,
      }))
    ),
    transmittalTemplates: await Promise.all(
      transmittalTemplates.map(async (template) => ({
        ...template,
        fileUrl: template.providerKey
          ? `/api/templates/transmittal/${template.id}`
          : null,
      }))
    ),
  }
}

async function storeTemplateFile(input: {
  file: File
  pathPrefix: string
  version: number
}) {
  if (!input.file.name.toLowerCase().endsWith(".docx")) {
    throw new Error("Templates must be uploaded as DOCX files.")
  }

  const extension = input.file.name.split(".").pop()?.toLowerCase() ?? "docx"
  const providerKeyHint = buildStorageKey(
    input.pathPrefix,
    `v${input.version}.${extension}`
  )

  return uploadFileToStorage({
    area: "source",
    providerKeyHint,
    file: input.file,
  })
}

export async function createCoverSheetTemplate(input: {
  actor: CurrentAppUser
  scope: "global" | "client" | "project"
  clientId?: string
  projectId?: string
  kind: CoverSheetKind
  name: string
  description?: string
  isDefault?: boolean
  file: File
}) {
  const parsed = coverTemplateSchema.parse({
    scope: input.scope,
    clientId: input.clientId,
    projectId: input.projectId,
    kind: input.kind,
    name: input.name,
    description: input.description,
    isDefault: input.isDefault ?? false,
  })

  const scopeFields = resolveScopeFields(parsed)
  const version = await getNextVersion({
    model: "cover",
    clientId: scopeFields.clientId,
    projectId: scopeFields.projectId,
    name: parsed.name,
    kind: parsed.kind,
  })
  const upload = await storeTemplateFile({
    file: input.file,
    pathPrefix: buildStorageKey(
      "templates",
      "covers",
      scopeFields.scopeLevel.toLowerCase(),
      scopeFields.scopeKey,
      parsed.kind.toLowerCase(),
      parsed.name
    ),
    version,
  })

  return prisma.$transaction(async (tx) => {
    if (parsed.isDefault) {
      await tx.coverSheetTemplate.updateMany({
        where: {
          deletedAt: null,
          kind: parsed.kind,
          clientId: scopeFields.clientId,
          projectId: scopeFields.projectId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const created = await tx.coverSheetTemplate.create({
      data: {
        kind: parsed.kind,
        clientId: scopeFields.clientId,
        projectId: scopeFields.projectId,
        name: parsed.name,
        description: parsed.description || null,
        fileName: upload.fileName,
        storageProvider: upload.storageProvider,
        providerKey: upload.providerKey,
        version,
        isDefault: parsed.isDefault,
        isActive: true,
        placeholderSchema: {
          scopeLevel: scopeFields.scopeLevel,
          scopeKey: scopeFields.scopeKey,
        },
      },
    })

    await tx.auditLog.create({
      data: {
        actorUserId: input.actor.id,
        action: "template.cover.create",
        entityType: "CoverSheetTemplate",
        entityId: created.id,
        projectId: scopeFields.projectId,
        clientId: scopeFields.clientId,
        afterSnapshot: {
          kind: parsed.kind,
          name: parsed.name,
          version,
          isDefault: parsed.isDefault,
        },
      },
    })

    return created
  })
}

export async function createTransmittalTemplate(input: {
  actor: CurrentAppUser
  scope: "global" | "client" | "project"
  clientId?: string
  projectId?: string
  name: string
  description?: string
  isDefault?: boolean
  file: File
}) {
  const parsed = transmittalTemplateSchema.parse({
    scope: input.scope,
    clientId: input.clientId,
    projectId: input.projectId,
    name: input.name,
    description: input.description,
    isDefault: input.isDefault ?? false,
  })

  const scopeFields = resolveScopeFields(parsed)
  const version = await getNextVersion({
    model: "transmittal",
    clientId: scopeFields.clientId,
    projectId: scopeFields.projectId,
    name: parsed.name,
  })
  const upload = await storeTemplateFile({
    file: input.file,
    pathPrefix: buildStorageKey(
      "templates",
      "transmittals",
      scopeFields.scopeLevel.toLowerCase(),
      scopeFields.scopeKey,
      parsed.name
    ),
    version,
  })

  return prisma.$transaction(async (tx) => {
    if (parsed.isDefault) {
      await tx.transmittalTemplate.updateMany({
        where: {
          deletedAt: null,
          clientId: scopeFields.clientId,
          projectId: scopeFields.projectId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const created = await tx.transmittalTemplate.create({
      data: {
        clientId: scopeFields.clientId,
        projectId: scopeFields.projectId,
        name: parsed.name,
        description: parsed.description || null,
        fileName: upload.fileName,
        storageProvider: upload.storageProvider,
        providerKey: upload.providerKey,
        version,
        isDefault: parsed.isDefault,
        isActive: true,
        placeholderSchema: {
          scopeLevel: scopeFields.scopeLevel,
          scopeKey: scopeFields.scopeKey,
        },
      },
    })

    await tx.auditLog.create({
      data: {
        actorUserId: input.actor.id,
        action: "template.transmittal.create",
        entityType: "TransmittalTemplate",
        entityId: created.id,
        projectId: scopeFields.projectId,
        clientId: scopeFields.clientId,
        afterSnapshot: {
          name: parsed.name,
          version,
          isDefault: parsed.isDefault,
        },
      },
    })

    return created
  })
}

export async function findPreferredCoverSheetTemplate(input: {
  kind: CoverSheetKind
  clientId: string
  projectId: string
}) {
  const templates = await prisma.coverSheetTemplate.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      kind: input.kind,
      OR: [
        {
          projectId: input.projectId,
        },
        {
          projectId: null,
          clientId: input.clientId,
        },
        {
          projectId: null,
          clientId: null,
        },
      ],
    },
    orderBy: [
      {
        projectId: "desc",
      },
      {
        clientId: "desc",
      },
      {
        isDefault: "desc",
      },
      {
        version: "desc",
      },
    ],
  })

  return templates[0] ?? null
}

export async function findPreferredTransmittalTemplate(input: {
  clientId: string
  projectId: string
}) {
  const templates = await prisma.transmittalTemplate.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        {
          projectId: input.projectId,
        },
        {
          projectId: null,
          clientId: input.clientId,
        },
        {
          projectId: null,
          clientId: null,
        },
      ],
    },
    orderBy: [
      {
        projectId: "desc",
      },
      {
        clientId: "desc",
      },
      {
        isDefault: "desc",
      },
      {
        version: "desc",
      },
    ],
  })

  return templates[0] ?? null
}
