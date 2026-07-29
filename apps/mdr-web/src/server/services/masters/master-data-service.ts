import "server-only"
import { AuditSeverity, ScopeLevel } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"

const GLOBAL_SCOPE_KEY = "system"

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .transform((value) =>
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  )

const createNamedMasterSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
})

const createReviewCodeSchema = z.object({
  code: codeSchema,
  label: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional(),
  requiresResubmittal: z.boolean().optional().default(false),
  finalizesDocument: z.boolean().optional().default(false),
  informationalOnly: z.boolean().optional().default(false),
})

export async function getGlobalMasterData() {
  const [disciplines, documentTypes, releasePurposes, reviewCodes, numberingRules] =
    await Promise.all([
      prisma.discipline.findMany({
        where: { deletedAt: null },
        orderBy: [{ code: "asc" }],
      }),
      prisma.documentTypeCategory.findMany({
        where: {
          scopeLevel: ScopeLevel.Global,
          scopeKey: GLOBAL_SCOPE_KEY,
        },
        orderBy: [{ code: "asc" }],
      }),
      prisma.releasePurpose.findMany({
        where: {
          scopeLevel: ScopeLevel.Global,
          scopeKey: GLOBAL_SCOPE_KEY,
        },
        orderBy: [{ code: "asc" }],
      }),
      prisma.reviewCode.findMany({
        where: {
          scopeLevel: ScopeLevel.Global,
          scopeKey: GLOBAL_SCOPE_KEY,
        },
        orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
      }),
      prisma.numberingRule.findMany({
        where: {
          scopeLevel: ScopeLevel.Global,
          scopeKey: GLOBAL_SCOPE_KEY,
        },
        include: {
          tokens: {
            orderBy: [{ order: "asc" }],
          },
        },
        orderBy: [{ name: "asc" }],
      }),
    ])

  return {
    disciplines,
    documentTypes,
    releasePurposes,
    reviewCodes,
    numberingRules,
  }
}

export async function createGlobalDiscipline(input: unknown) {
  const parsed = createNamedMasterSchema.parse(input)

  return prisma.$transaction(async (tx) => {
    const discipline = await tx.discipline.create({
      data: {
        code: parsed.code,
        name: parsed.name.trim(),
        description: parsed.description?.trim() || null,
        isActive: true,
      },
    })

    await tx.auditLog.create({
      data: {
        action: "master.discipline.create",
        entityType: "Discipline",
        entityId: discipline.id,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          code: discipline.code,
          name: discipline.name,
        },
      },
    })

    return discipline
  })
}

export async function createGlobalDocumentType(input: unknown) {
  const parsed = createNamedMasterSchema.parse(input)

  return prisma.$transaction(async (tx) => {
    const documentType = await tx.documentTypeCategory.create({
      data: {
        scopeLevel: ScopeLevel.Global,
        scopeKey: GLOBAL_SCOPE_KEY,
        code: parsed.code,
        name: parsed.name.trim(),
        description: parsed.description?.trim() || null,
        isActive: true,
      },
    })

    await tx.auditLog.create({
      data: {
        action: "master.document_type.create",
        entityType: "DocumentTypeCategory",
        entityId: documentType.id,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          code: documentType.code,
          name: documentType.name,
        },
      },
    })

    return documentType
  })
}

export async function createGlobalReleasePurpose(input: unknown) {
  const parsed = createNamedMasterSchema.parse(input)

  return prisma.$transaction(async (tx) => {
    const releasePurpose = await tx.releasePurpose.create({
      data: {
        scopeLevel: ScopeLevel.Global,
        scopeKey: GLOBAL_SCOPE_KEY,
        code: parsed.code,
        name: parsed.name.trim(),
        description: parsed.description?.trim() || null,
        isActive: true,
      },
    })

    await tx.auditLog.create({
      data: {
        action: "master.release_purpose.create",
        entityType: "ReleasePurpose",
        entityId: releasePurpose.id,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          code: releasePurpose.code,
          name: releasePurpose.name,
        },
      },
    })

    return releasePurpose
  })
}

export async function createGlobalReviewCode(input: unknown) {
  const parsed = createReviewCodeSchema.parse(input)
  const existingCount = await prisma.reviewCode.count({
    where: {
      scopeLevel: ScopeLevel.Global,
      scopeKey: GLOBAL_SCOPE_KEY,
    },
  })

  return prisma.$transaction(async (tx) => {
    const reviewCode = await tx.reviewCode.create({
      data: {
        scopeLevel: ScopeLevel.Global,
        scopeKey: GLOBAL_SCOPE_KEY,
        code: parsed.code,
        label: parsed.label.trim(),
        description: parsed.description?.trim() || null,
        requiresResubmittal: parsed.requiresResubmittal,
        finalizesDocument: parsed.finalizesDocument,
        informationalOnly: parsed.informationalOnly,
        displayOrder: existingCount + 1,
        isActive: true,
        isDefault: false,
      },
    })

    await tx.auditLog.create({
      data: {
        action: "master.review_code.create",
        entityType: "ReviewCode",
        entityId: reviewCode.id,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          code: reviewCode.code,
          label: reviewCode.label,
          requiresResubmittal: reviewCode.requiresResubmittal,
          finalizesDocument: reviewCode.finalizesDocument,
          informationalOnly: reviewCode.informationalOnly,
        },
      },
    })

    return reviewCode
  })
}
