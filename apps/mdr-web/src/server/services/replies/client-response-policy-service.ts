import "server-only"
import { createHash, randomUUID } from "node:crypto"
import {
  FoundationRecordStatus,
  StorageProvider,
  type ClientResponseCode,
} from "@prisma/client"
import {
  AIR_PRODUCTS_RESPONSE_FIXTURE,
  CLIENT_RESPONSE_FILE_KINDS,
  CLIENT_RESPONSE_OUTCOMES,
  CONDITIONAL_CODE_2_FIXTURE,
  JIGPC_RESPONSE_FIXTURE,
  validateResponseCodeDefinitions,
  type ClientResponseEffects,
  type ResponseCodeDefinition,
} from "@dtg/client-response-domain"
import { z } from "zod"
import { env } from "@/lib/config/env"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import {
  buildStoragePath,
  uploadBytesToSupabaseStorage,
} from "@/server/services/storage/storage-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const fixtures = {
  AIR_PRODUCTS: AIR_PRODUCTS_RESPONSE_FIXTURE,
  JIGPC: JIGPC_RESPONSE_FIXTURE,
  CONDITIONAL_CODE_2: CONDITIONAL_CODE_2_FIXTURE,
} as const

const createSetSchema = z.object({
  clientId: z.string().trim().min(1),
  code: z.string().trim().min(2).max(60),
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional(),
  fixture: z.enum(["NONE", ...Object.keys(fixtures)]),
})

const addCodeSchema = z.object({
  versionId: z.string().trim().min(1),
  externalCode: z.string().trim().min(1).max(40),
  exactWording: z.string().trim().min(1).max(1000),
  internalLabel: z.string().trim().min(1).max(200),
  outcomeClass: z.enum(CLIENT_RESPONSE_OUTCOMES),
  expectedPrimaryFileKind: z.enum(CLIENT_RESPONSE_FILE_KINDS).optional(),
  displayOrder: z.coerce.number().int().min(0).max(1000),
  countsAsApproved: z.boolean(),
  finalApproval: z.boolean(),
  requiresCommentRectification: z.boolean(),
  requiresNewRevision: z.boolean(),
  requiresInternalReapproval: z.boolean(),
  requiresResubmission: z.boolean(),
  allowsTemporaryUse: z.boolean(),
  allowsLifecycleClosure: z.boolean(),
  requiresNewDocumentNumber: z.boolean(),
  requiresReturnedFile: z.boolean(),
})

function assertPolicyAdmin(actor: CurrentAppUser) {
  const allowed = hasAnyPermission({
    required: [
      PERMISSIONS.clientRepliesManage,
      PERMISSIONS.templatesManage,
      PERMISSIONS.platformManage,
    ],
    systemRoles: actor.userRoles.map((item) => item.role.code),
    projectRoles: actor.projectRoles.map((item) => item.role.code),
  })
  if (!allowed) {
    throw new Error("You do not have permission to manage response policies.")
  }
}

function codeEffects(
  code: Pick<
    ClientResponseCode,
    | "outcomeClass"
    | "countsAsApproved"
    | "finalApproval"
    | "requiresCommentRectification"
    | "requiresNewRevision"
    | "requiresInternalReapproval"
    | "requiresResubmission"
    | "allowsTemporaryUse"
    | "allowsLifecycleClosure"
    | "requiresNewDocumentNumber"
    | "requiresReturnedFile"
    | "expectedPrimaryFileKind"
  >
): ClientResponseEffects {
  return {
    outcomeClass: code.outcomeClass as ClientResponseEffects["outcomeClass"],
    countsAsApproved: code.countsAsApproved,
    finalApproval: code.finalApproval,
    rectificationRequired: code.requiresCommentRectification,
    newRevisionRequired: code.requiresNewRevision,
    internalReapprovalRequired: code.requiresInternalReapproval,
    resubmissionRequired: code.requiresResubmission,
    temporaryUseAllowed: code.allowsTemporaryUse,
    closureAllowed: code.allowsLifecycleClosure,
    newDocumentNumberRequired: code.requiresNewDocumentNumber,
    returnedFileRequired: code.requiresReturnedFile,
    expectedFileKind:
      (code.expectedPrimaryFileKind as ClientResponseEffects["expectedFileKind"]) ??
      undefined,
  }
}

function toDefinition(code: ClientResponseCode): ResponseCodeDefinition {
  return {
    externalCode: code.externalCode,
    exactWording: code.exactWording,
    internalLabel: code.internalLabel,
    displayOrder: code.displayOrder,
    effects: codeEffects(code),
  }
}

function definitionData(definition: ResponseCodeDefinition) {
  return {
    externalCode: definition.externalCode,
    exactWording: definition.exactWording,
    internalLabel: definition.internalLabel,
    outcomeClass: definition.effects.outcomeClass,
    countsAsApproved: definition.effects.countsAsApproved,
    finalApproval: definition.effects.finalApproval,
    requiresCommentRectification: definition.effects.rectificationRequired,
    requiresNewRevision: definition.effects.newRevisionRequired,
    requiresInternalReapproval: definition.effects.internalReapprovalRequired,
    requiresResubmission: definition.effects.resubmissionRequired,
    allowsTemporaryUse: definition.effects.temporaryUseAllowed,
    allowsLifecycleClosure: definition.effects.closureAllowed,
    requiresNewDocumentNumber: definition.effects.newDocumentNumberRequired,
    requiresReturnedFile: definition.effects.returnedFileRequired,
    expectedPrimaryFileKind: definition.effects.expectedFileKind,
    displayOrder: definition.displayOrder,
  }
}

export async function getResponsePolicyAdministration(actor: CurrentAppUser) {
  assertPolicyAdmin(actor)
  const [clients, projects, sets, references] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { code: "asc" },
      select: { id: true, clientId: true, code: true, name: true },
    }),
    prisma.clientResponseCodeSet.findMany({
      include: {
        versions: {
          include: { codes: { orderBy: { displayOrder: "asc" } } },
          orderBy: { version: "desc" },
        },
      },
      orderBy: [{ clientId: "asc" }, { code: "asc" }],
    }),
    prisma.clientResponseCodeReference.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ])
  const referencedFiles = await prisma.fileObject.findMany({
    where: {
      id: { in: references.map((reference) => reference.fileObjectId) },
    },
    select: { id: true, fileName: true, checksum: true },
  })
  const fileById = new Map(referencedFiles.map((file) => [file.id, file]))
  return {
    clients,
    projects,
    sets,
    references: references.map((reference) => ({
      ...reference,
      file: fileById.get(reference.fileObjectId) ?? null,
    })),
  }
}

export async function createResponseCodeSetDraft(
  actor: CurrentAppUser,
  input: unknown
) {
  assertPolicyAdmin(actor)
  const parsed = createSetSchema.parse(input)
  const fixture =
    parsed.fixture === "NONE"
      ? null
      : fixtures[parsed.fixture as keyof typeof fixtures]
  if (fixture && process.env.NODE_ENV === "production") {
    throw new Error("Development response fixtures are disabled in production.")
  }
  return prisma.clientResponseCodeSet.create({
    data: {
      clientId: parsed.clientId,
      code: parsed.code,
      name: parsed.name,
      description: parsed.description || null,
      createdByUserId: actor.id,
      versions: {
        create: {
          version: 1,
          codes: fixture
            ? { create: fixture.codes.map(definitionData) }
            : undefined,
        },
      },
    },
  })
}

export async function cloneResponsePolicyToProject(
  actor: CurrentAppUser,
  input: { sourceVersionId: unknown; projectId: unknown }
) {
  assertPolicyAdmin(actor)
  const parsed = z
    .object({
      sourceVersionId: z.string().trim().min(1),
      projectId: z.string().trim().min(1),
    })
    .parse(input)
  const [source, project] = await Promise.all([
    prisma.clientResponseCodeSetVersion.findUnique({
      where: { id: parsed.sourceVersionId },
      include: { codeSet: true, codes: true },
    }),
    prisma.project.findUnique({ where: { id: parsed.projectId } }),
  ])
  if (!source || !project || source.codeSet.clientId !== project.clientId) {
    throw new Error("The source policy is not valid for this project.")
  }
  const suffix = project.code.replace(/[^A-Za-z0-9_-]/g, "_")
  return prisma.clientResponseCodeSet.create({
    data: {
      clientId: project.clientId,
      code: `${source.codeSet.code}_${suffix}_${Date.now()}`,
      name: `${source.codeSet.name} - ${project.code}`,
      description: `Project clone for ${project.name}.`,
      createdByUserId: actor.id,
      versions: {
        create: {
          version: 1,
          codes: {
            create: source.codes
              .sort((left, right) => left.displayOrder - right.displayOrder)
              .map((code) => definitionData(toDefinition(code))),
          },
        },
      },
    },
  })
}

export async function createNextResponseCodeVersion(
  actor: CurrentAppUser,
  codeSetId: string
) {
  assertPolicyAdmin(actor)
  const latest = await prisma.clientResponseCodeSetVersion.findFirst({
    where: { codeSetId },
    include: { codes: { orderBy: { displayOrder: "asc" } } },
    orderBy: { version: "desc" },
  })
  if (!latest) throw new Error("The response policy was not found.")
  const existingDraft = await prisma.clientResponseCodeSetVersion.findFirst({
    where: { codeSetId, status: FoundationRecordStatus.Draft },
  })
  if (existingDraft) {
    throw new Error("Complete the existing draft before creating another.")
  }
  return prisma.clientResponseCodeSetVersion.create({
    data: {
      codeSetId,
      version: latest.version + 1,
      codes: {
        create: latest.codes.map((code) => definitionData(toDefinition(code))),
      },
    },
  })
}

export async function addResponseCode(actor: CurrentAppUser, input: unknown) {
  assertPolicyAdmin(actor)
  const parsed = addCodeSchema.parse(input)
  const version = await prisma.clientResponseCodeSetVersion.findUnique({
    where: { id: parsed.versionId },
  })
  if (!version || version.status !== FoundationRecordStatus.Draft) {
    throw new Error("Only draft response policy versions can be edited.")
  }
  const definition: ResponseCodeDefinition = {
    externalCode: parsed.externalCode,
    exactWording: parsed.exactWording,
    internalLabel: parsed.internalLabel,
    displayOrder: parsed.displayOrder,
    effects: {
      outcomeClass: parsed.outcomeClass,
      countsAsApproved: parsed.countsAsApproved,
      finalApproval: parsed.finalApproval,
      rectificationRequired: parsed.requiresCommentRectification,
      newRevisionRequired: parsed.requiresNewRevision,
      internalReapprovalRequired: parsed.requiresInternalReapproval,
      resubmissionRequired: parsed.requiresResubmission,
      temporaryUseAllowed: parsed.allowsTemporaryUse,
      closureAllowed: parsed.allowsLifecycleClosure,
      newDocumentNumberRequired: parsed.requiresNewDocumentNumber,
      returnedFileRequired: parsed.requiresReturnedFile,
      expectedFileKind: parsed.expectedPrimaryFileKind,
    },
  }
  const errors = validateResponseCodeDefinitions([definition])
  if (errors.length) throw new Error(errors.join(" "))
  return prisma.clientResponseCode.create({
    data: { versionId: version.id, ...definitionData(definition) },
  })
}

export async function removeResponseCode(
  actor: CurrentAppUser,
  codeId: string
) {
  assertPolicyAdmin(actor)
  const code = await prisma.clientResponseCode.findUnique({
    where: { id: codeId },
    include: { version: true },
  })
  if (!code || code.version.status !== FoundationRecordStatus.Draft) {
    throw new Error("Only draft response codes can be removed.")
  }
  await prisma.clientResponseCode.delete({ where: { id: code.id } })
}

export async function reorderResponseCode(
  actor: CurrentAppUser,
  input: { codeId: string; direction: "UP" | "DOWN" }
) {
  assertPolicyAdmin(actor)
  const code = await prisma.clientResponseCode.findUnique({
    where: { id: input.codeId },
    include: { version: true },
  })
  if (!code || code.version.status !== FoundationRecordStatus.Draft) {
    throw new Error("Only draft response codes can be reordered.")
  }
  const codes = await prisma.clientResponseCode.findMany({
    where: { versionId: code.versionId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  })
  const index = codes.findIndex((item) => item.id === code.id)
  const targetIndex = input.direction === "UP" ? index - 1 : index + 1
  const target = codes[targetIndex]
  if (!target) return
  await prisma.$transaction([
    prisma.clientResponseCode.update({
      where: { id: code.id },
      data: { displayOrder: target.displayOrder },
    }),
    prisma.clientResponseCode.update({
      where: { id: target.id },
      data: { displayOrder: code.displayOrder },
    }),
  ])
}

export async function uploadResponseCodeReference(
  actor: CurrentAppUser,
  input: {
    codeSetId: string
    referenceKind: string
    description?: string
    file: File
  }
) {
  assertPolicyAdmin(actor)
  const codeSet = await prisma.clientResponseCodeSet.findUnique({
    where: { id: input.codeSetId },
  })
  if (!codeSet) throw new Error("The response policy was not found.")
  if (!(input.file instanceof File) || input.file.size === 0) {
    throw new Error("A reference sample or procedure file is required.")
  }
  if (input.file.size > 20 * 1024 * 1024) {
    throw new Error("Reference files must not exceed 20 MiB.")
  }
  const bytes = Buffer.from(await input.file.arrayBuffer())
  const uploaded = await uploadBytesToSupabaseStorage({
    bucket: env.SUPABASE_STORAGE_BUCKET_SOURCE,
    path: buildStoragePath(
      "client-response-policies",
      codeSet.clientId,
      codeSet.code,
      "references",
      `${randomUUID()}-${input.file.name}`
    ),
    bytes,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
  })
  const checksum = createHash("sha256").update(bytes).digest("hex")
  return prisma.$transaction(async (tx) => {
    const fileObject = await tx.fileObject.create({
      data: {
        storageProvider: StorageProvider.Supabase,
        providerKey: `${uploaded.bucket}/${uploaded.path}`,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        sizeBytes: BigInt(uploaded.fileSizeBytes),
        checksum,
      },
    })
    const reference = await tx.clientResponseCodeReference.create({
      data: {
        codeSetId: codeSet.id,
        fileObjectId: fileObject.id,
        referenceKind: input.referenceKind.trim() || "REFERENCE_SAMPLE",
        description: input.description?.trim() || null,
        createdByUserId: actor.id,
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "client_response_policy.reference_uploaded",
        entityType: "ClientResponseCodeReference",
        entityId: reference.id,
        clientId: codeSet.clientId,
        relevantHashes: { sha256: checksum },
      },
    })
    return reference
  })
}

export async function publishResponseCodeVersion(
  actor: CurrentAppUser,
  input: { versionId: unknown; projectId?: unknown }
) {
  assertPolicyAdmin(actor)
  const parsed = z
    .object({
      versionId: z.string().trim().min(1),
      projectId: z.string().trim().optional(),
    })
    .parse(input)
  const version = await prisma.clientResponseCodeSetVersion.findUnique({
    where: { id: parsed.versionId },
    include: { codeSet: true, codes: { orderBy: { displayOrder: "asc" } } },
  })
  if (!version || version.status !== FoundationRecordStatus.Draft) {
    throw new Error("Only a draft response policy can be published.")
  }
  const definitions = version.codes.map(toDefinition)
  const errors = validateResponseCodeDefinitions(definitions)
  if (errors.length) throw new Error(errors.join(" "))
  const snapshotHash = createHash("sha256")
    .update(JSON.stringify(definitions))
    .digest("hex")
  return prisma.$transaction(async (tx) => {
    const published = await tx.clientResponseCodeSetVersion.update({
      where: { id: version.id },
      data: {
        status: FoundationRecordStatus.Published,
        validatedAt: new Date(),
        publishedAt: new Date(),
        publishedByUserId: actor.id,
        validationResult: { valid: true, errors: [] },
        snapshotHash,
      },
    })
    await tx.clientResponseCodeSetVersion.updateMany({
      where: {
        codeSetId: version.codeSetId,
        id: { not: version.id },
        status: FoundationRecordStatus.Published,
      },
      data: {
        status: FoundationRecordStatus.Superseded,
        supersededAt: new Date(),
      },
    })
    if (parsed.projectId) {
      const project = await tx.project.findUniqueOrThrow({
        where: { id: parsed.projectId },
      })
      if (project.clientId !== version.codeSet.clientId) {
        throw new Error("The policy client does not match the project client.")
      }
      const previous = await tx.projectResponseCodeConfiguration.findUnique({
        where: { projectId: project.id },
      })
      await tx.projectResponseCodeConfiguration.upsert({
        where: { projectId: project.id },
        create: {
          projectId: project.id,
          codeSetVersionId: version.id,
          configuredByUserId: actor.id,
        },
        update: {
          codeSetVersionId: version.id,
          configuredByUserId: actor.id,
          configuredAt: new Date(),
        },
      })
      if (previous && previous.codeSetVersionId !== version.id) {
        await tx.clientResponseCodeSetVersion.updateMany({
          where: {
            id: previous.codeSetVersionId,
            status: FoundationRecordStatus.Published,
          },
          data: {
            status: FoundationRecordStatus.Superseded,
            supersededAt: new Date(),
          },
        })
      }
    }
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "client_response_policy.published",
        entityType: "ClientResponseCodeSetVersion",
        entityId: version.id,
        clientId: version.codeSet.clientId,
        projectId: parsed.projectId || null,
        relevantHashes: { snapshotHash },
        afterSnapshot: {
          version: version.version,
          codeCount: definitions.length,
        },
      },
    })
    return published
  })
}

export async function resolvePublishedResponsePolicy(input: {
  projectId: string
  clientId: string
}) {
  const configured = await prisma.projectResponseCodeConfiguration.findUnique({
    where: { projectId: input.projectId },
  })
  if (configured) {
    return prisma.clientResponseCodeSetVersion.findFirst({
      where: {
        id: configured.codeSetVersionId,
        status: FoundationRecordStatus.Published,
        codeSet: { clientId: input.clientId },
      },
      include: {
        codeSet: true,
        codes: { orderBy: { displayOrder: "asc" } },
      },
    })
  }
  return prisma.clientResponseCodeSetVersion.findFirst({
    where: {
      status: FoundationRecordStatus.Published,
      codeSet: { clientId: input.clientId },
    },
    include: {
      codeSet: true,
      codes: { orderBy: { displayOrder: "asc" } },
    },
    orderBy: [{ publishedAt: "desc" }, { version: "desc" }],
  })
}

export { codeEffects, toDefinition }
