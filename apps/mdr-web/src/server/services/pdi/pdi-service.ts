import "server-only"
import {
  AuditSeverity,
  ClientReplyState,
  PdiStatus,
  RevisionStatus,
  ScopeLevel,
  WorkflowStatus,
} from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"
import {
  assertPdiPromotionAvailable,
  assertPdiTransition,
  resolvePdiSentStatus,
} from "@/lib/pdi/policy"
import { generateDocumentNumber } from "@/server/services/numbering/document-numbering-service"
import { seedWorkflowStepsForRevision } from "@/server/services/workflow/workflow-service"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import { resolveAccessibleProjectIds } from "@/server/services/auth/access-scope"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const GLOBAL_SCOPE_KEY = "system"

const createPdiItemSchema = z.object({
  projectId: z.string().trim().min(1),
  disciplineId: z.string().trim().min(1),
  documentTypeCategoryId: z.string().trim().min(1),
  releasePurposeId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(200),
  revision: z.string().trim().min(1).max(20).default("00"),
  remarks: z.string().trim().max(1000).optional(),
  tags: z.string().trim().optional(),
  createdByUserId: z.string().trim().min(1).optional(),
})

const pdiItemIdSchema = z.object({
  pdiItemId: z.string().trim().min(1),
})

const updateClientNumberSchema = z.object({
  pdiItemId: z.string().trim().min(1),
  clientDocumentNumber: z.string().trim().min(1).max(120),
})

const updateTitleSchema = z.object({
  pdiItemId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(200),
  reason: z.string().trim().min(3).max(500),
})

function normalizeTags(value?: string) {
  if (!value) {
    return []
  }

  return Array.from(
    new Set(
      value
        .split(/[,\n;]+/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

// Mirrors the PDI entry in the sidebar. Hiding the link is presentation only;
// this is the authorization boundary for the register itself.
export const PDI_REGISTER_PERMISSIONS = [
  PERMISSIONS.pdiManage,
  PERMISSIONS.pdiCollaborate,
]

export const PDI_REGISTER_PAGE_SIZE = 20

export async function getPdiOverview(user: CurrentAppUser, page = 1) {
  assertUserHasAnyPermission(user, PDI_REGISTER_PERMISSIONS)

  const currentPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const accessibleProjectIds = await resolveAccessibleProjectIds(user)

  const [projects, disciplines, documentTypes, releasePurposes, items] =
    await Promise.all([
      prisma.project.findMany({
        where: {
          id: { in: accessibleProjectIds },
          deletedAt: null,
        },
        orderBy: [{ code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          client: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      }),
      prisma.discipline.findMany({
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
      prisma.documentTypeCategory.findMany({
        where: {
          scopeLevel: ScopeLevel.Global,
          scopeKey: GLOBAL_SCOPE_KEY,
          isActive: true,
        },
        orderBy: [{ code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
        },
      }),
      prisma.releasePurpose.findMany({
        where: {
          scopeLevel: ScopeLevel.Global,
          scopeKey: GLOBAL_SCOPE_KEY,
          isActive: true,
        },
        orderBy: [{ code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
        },
      }),
      prisma.pdiItem.findMany({
        where: {
          projectId: { in: accessibleProjectIds },
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (currentPage - 1) * PDI_REGISTER_PAGE_SIZE,
        take: PDI_REGISTER_PAGE_SIZE,
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true,
              client: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
          discipline: {
            select: {
              code: true,
              name: true,
            },
          },
          documentTypeCategory: {
            select: {
              code: true,
              name: true,
            },
          },
          releasePurpose: {
            select: {
              code: true,
              name: true,
            },
          },
          mdrDocument: {
            select: {
              id: true,
              currentRevisionId: true,
              currentWorkflowStatus: true,
              currentClientReplyState: true,
            },
          },
        },
      }),
    ])

  // Counts describe the whole register, not the page in hand.
  const statusGroups = await prisma.pdiItem.groupBy({
    by: ["status"],
    where: {
      deletedAt: null,
      projectId: { in: accessibleProjectIds },
    },
    _count: { _all: true },
  })
  const byStatus = new Map(
    statusGroups.map((group) => [group.status, group._count._all])
  )
  const total = statusGroups.reduce((sum, group) => sum + group._count._all, 0)

  const counts = {
    total,
    pendingClientNumber:
      (byStatus.get(PdiStatus.ClientNumberPending) ?? 0) +
      (byStatus.get(PdiStatus.SentToClient) ?? 0),
    clientNumberReceived: byStatus.get(PdiStatus.ClientNumberReceived) ?? 0,
    converted: byStatus.get(PdiStatus.ConvertedToMdr) ?? 0,
  }

  return {
    counts,
    pagination: {
      page: currentPage,
      pageSize: PDI_REGISTER_PAGE_SIZE,
      total,
      pageCount: Math.max(1, Math.ceil(total / PDI_REGISTER_PAGE_SIZE)),
    },
    projects,
    disciplines,
    documentTypes,
    releasePurposes,
    items,
  }
}

export async function createPdiItem(input: unknown) {
  const parsed = createPdiItemSchema.parse(input)

  const project = await prisma.project.findUnique({
    where: {
      id: parsed.projectId,
    },
    include: {
      client: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      pdiRegister: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!project || project.deletedAt) {
    throw new Error("The selected project could not be found.")
  }

  const [discipline, documentTypeCategory, releasePurpose] = await Promise.all([
    prisma.discipline.findUnique({
      where: {
        id: parsed.disciplineId,
      },
    }),
    prisma.documentTypeCategory.findUnique({
      where: {
        id: parsed.documentTypeCategoryId,
      },
    }),
    prisma.releasePurpose.findUnique({
      where: {
        id: parsed.releasePurposeId,
      },
    }),
  ])

  if (!discipline || discipline.deletedAt || !discipline.isActive) {
    throw new Error("The selected discipline is not available.")
  }

  if (!documentTypeCategory || !documentTypeCategory.isActive) {
    throw new Error("The selected document type is not available.")
  }

  if (!releasePurpose || !releasePurpose.isActive) {
    throw new Error("The selected release purpose is not available.")
  }

  return prisma.$transaction(async (tx) => {
    const register =
      project.pdiRegister ??
      (await tx.pdiRegister.create({
        data: {
          projectId: project.id,
        },
      }))

    const numberGeneration = await generateDocumentNumber({
      db: tx,
      project,
      discipline,
      documentTypeCategory,
      releasePurpose,
      revision: parsed.revision,
    })

    const pdiItem = await tx.pdiItem.create({
      data: {
        registerId: register.id,
        projectId: project.id,
        disciplineId: discipline.id,
        documentTypeCategoryId: documentTypeCategory.id,
        releasePurposeId: releasePurpose.id,
        numberingRuleId: numberGeneration.numberingRuleId,
        dtgsaDocumentNumber: numberGeneration.dtgsaDocumentNumber,
        title: parsed.title.trim(),
        revision: parsed.revision.trim(),
        remarks: parsed.remarks?.trim() || null,
        tags: normalizeTags(parsed.tags),
        createdByUserId: parsed.createdByUserId?.trim() || null,
      },
    })

    await tx.auditLog.create({
      data: {
        actorUserId: parsed.createdByUserId?.trim() || null,
        action: "pdi.item.create",
        entityType: "PdiItem",
        entityId: pdiItem.id,
        projectId: project.id,
        clientId: project.client.id,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          dtgsaDocumentNumber: numberGeneration.dtgsaDocumentNumber,
          title: pdiItem.title,
          disciplineCode: discipline.code,
          documentTypeCode: documentTypeCategory.code,
          releasePurposeCode: releasePurpose.code,
          sequenceScopeKey: numberGeneration.scopeKey,
        },
      },
    })

    return pdiItem
  })
}

export async function markPdiItemSentToClient(input: unknown) {
  const parsed = pdiItemIdSchema.parse(input)

  return prisma.$transaction(async (tx) => {
    const item = await tx.pdiItem.findUnique({
      where: {
        id: parsed.pdiItemId,
      },
      include: {
        project: {
          select: {
            clientId: true,
          },
        },
      },
    })

    if (!item || item.deletedAt) {
      throw new Error("The selected PDI item could not be found.")
    }

    if (
      item.status === PdiStatus.ClientNumberPending ||
      item.status === PdiStatus.ClientNumberReceived
    ) {
      return item
    }

    assertPdiTransition(item.status, PdiStatus.SentToClient)
    const nextStatus = resolvePdiSentStatus(item.clientDocumentNumber)
    assertPdiTransition(PdiStatus.SentToClient, nextStatus)

    const result = await tx.pdiItem.updateMany({
      where: {
        id: item.id,
        status: item.status,
      },
      data: {
        status: nextStatus,
      },
    })

    if (result.count !== 1) {
      throw new Error("The PDI item changed before it could be sent.")
    }

    const updated = await tx.pdiItem.findUniqueOrThrow({
      where: { id: item.id },
    })

    await tx.auditLog.create({
      data: {
        action: "pdi.item.sent_to_client",
        entityType: "PdiItem",
        entityId: item.id,
        projectId: item.projectId,
        clientId: item.project.clientId,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          status: nextStatus,
        },
      },
    })

    return updated
  })
}

export async function updatePdiClientDocumentNumber(input: unknown) {
  const parsed = updateClientNumberSchema.parse(input)

  return prisma.$transaction(async (tx) => {
    const item = await tx.pdiItem.findUnique({
      where: {
        id: parsed.pdiItemId,
      },
      include: {
        project: {
          select: {
            clientId: true,
          },
        },
      },
    })

    if (!item || item.deletedAt) {
      throw new Error("The selected PDI item could not be found.")
    }

    const nextClientNumber = parsed.clientDocumentNumber.trim()

    // Re-applying the identical number is idempotent, which the workbook
    // reconciliation relies on when the same file is uploaded twice.
    if (item.clientDocumentNumber === nextClientNumber) {
      return item
    }

    // The client document number is permanent evidence of what the client
    // issued. Once recorded it can never be replaced, only read.
    if (item.clientDocumentNumber) {
      throw new Error(
        `This PDI item already carries client number ${item.clientDocumentNumber}. Client numbers cannot be changed once recorded.`
      )
    }

    assertPdiTransition(item.status, PdiStatus.ClientNumberReceived)

    const result = await tx.pdiItem.updateMany({
      where: {
        id: item.id,
        status: item.status,
      },
      data: {
        clientDocumentNumber: parsed.clientDocumentNumber.trim(),
        status: PdiStatus.ClientNumberReceived,
      },
    })

    if (result.count !== 1) {
      throw new Error(
        "The PDI item changed before the client number was saved."
      )
    }

    const updated = await tx.pdiItem.findUniqueOrThrow({
      where: { id: item.id },
    })

    await tx.auditLog.create({
      data: {
        action: "pdi.item.client_number.update",
        entityType: "PdiItem",
        entityId: item.id,
        projectId: item.projectId,
        clientId: item.project.clientId,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          clientDocumentNumber: updated.clientDocumentNumber,
          status: updated.status,
        },
      },
    })

    return updated
  })
}

export async function promotePdiItemToMdr(input: unknown) {
  const parsed = pdiItemIdSchema.parse(input)

  return prisma.$transaction(async (tx) => {
    const item = await tx.pdiItem.findUnique({
      where: {
        id: parsed.pdiItemId,
      },
      include: {
        project: {
          select: {
            clientId: true,
          },
        },
        mdrDocument: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!item || item.deletedAt) {
      throw new Error("The selected PDI item could not be found.")
    }

    assertPdiPromotionAvailable(item.mdrDocument, item.status)

    const document = await tx.mdrDocument.create({
      data: {
        projectId: item.projectId,
        disciplineId: item.disciplineId,
        documentTypeCategoryId: item.documentTypeCategoryId,
        releasePurposeId: item.releasePurposeId,
        sourcePdiItemId: item.id,
        dtgsaDocumentNumber: item.dtgsaDocumentNumber,
        clientDocumentNumber: item.clientDocumentNumber,
        title: item.title,
        remarks: item.remarks,
        currentWorkflowStatus: WorkflowStatus.Draft,
        currentClientReplyState: ClientReplyState.WaitingClientReply,
      },
    })

    const revision = await tx.documentRevision.create({
      data: {
        documentId: document.id,
        revisionLabel: item.revision,
        revisionIndex: 0,
        workflowStatus: WorkflowStatus.Draft,
        revisionStatus: RevisionStatus.Original,
        clientReplyState: ClientReplyState.WaitingClientReply,
        isCurrent: true,
      },
    })

    await seedWorkflowStepsForRevision(tx, revision.id)

    const updatedDocument = await tx.mdrDocument.update({
      where: {
        id: document.id,
      },
      data: {
        currentRevisionId: revision.id,
      },
    })

    assertPdiTransition(item.status, PdiStatus.ConvertedToMdr)
    const promotionUpdate = await tx.pdiItem.updateMany({
      where: {
        id: item.id,
        status: PdiStatus.ClientNumberReceived,
      },
      data: {
        status: PdiStatus.ConvertedToMdr,
      },
    })

    if (promotionUpdate.count !== 1) {
      throw new Error("The PDI item changed before it could be promoted.")
    }

    await tx.auditLog.create({
      data: {
        action: "pdi.item.promote_to_mdr",
        entityType: "PdiItem",
        entityId: item.id,
        projectId: item.projectId,
        clientId: item.project.clientId,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          mdrDocumentId: updatedDocument.id,
          revisionId: revision.id,
          dtgsaDocumentNumber: updatedDocument.dtgsaDocumentNumber,
        },
      },
    })

    return updatedDocument
  })
}

/// The title is the only field on a numbered PDI line that may change, and only
/// when the client has agreed to it. Both document numbers stay immutable, so
/// the change is recorded with a reason and the previous title for audit.
export async function updatePdiItemTitle(input: unknown, actorUserId?: string) {
  const parsed = updateTitleSchema.parse(input)

  return prisma.$transaction(async (tx) => {
    const item = await tx.pdiItem.findUnique({
      where: { id: parsed.pdiItemId },
      include: { project: { select: { clientId: true } } },
    })

    if (!item || item.deletedAt) {
      throw new Error("The selected PDI item could not be found.")
    }

    if (item.status === PdiStatus.ConvertedToMdr) {
      throw new Error(
        "This PDI item has been promoted to the MDR. Change the document title from the MDR record instead."
      )
    }

    const previousTitle = item.title

    if (previousTitle === parsed.title) {
      return item
    }

    const updated = await tx.pdiItem.update({
      where: { id: item.id },
      data: { title: parsed.title },
    })

    await tx.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action: "pdi.item.title.update",
        entityType: "PdiItem",
        entityId: item.id,
        projectId: item.projectId,
        clientId: item.project.clientId,
        severity: AuditSeverity.Info,
        beforeSnapshot: { title: previousTitle },
        afterSnapshot: {
          title: updated.title,
          reason: parsed.reason,
          dtgsaDocumentNumber: updated.dtgsaDocumentNumber,
          clientDocumentNumber: updated.clientDocumentNumber,
        },
      },
    })

    return updated
  })
}
