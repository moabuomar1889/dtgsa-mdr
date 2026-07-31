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

const PDI_REGISTER_PAGE_SIZE = 200

export async function getPdiOverview(user: CurrentAppUser) {
  assertUserHasAnyPermission(user, PDI_REGISTER_PERMISSIONS)

  const [projects, disciplines, documentTypes, releasePurposes, items] =
    await Promise.all([
      prisma.project.findMany({
        where: {
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
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
        take: PDI_REGISTER_PAGE_SIZE,
        include: {
          project: {
            select: {
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
              currentWorkflowStatus: true,
              currentClientReplyState: true,
            },
          },
        },
      }),
    ])

  const counts = {
    total: items.length,
    pendingClientNumber: items.filter(
      (item) =>
        item.status === PdiStatus.ClientNumberPending ||
        item.status === PdiStatus.SentToClient
    ).length,
    clientNumberReceived: items.filter(
      (item) => item.status === PdiStatus.ClientNumberReceived
    ).length,
    converted: items.filter((item) => item.status === PdiStatus.ConvertedToMdr)
      .length,
  }

  return {
    counts,
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

    if (
      item.status === PdiStatus.ClientNumberReceived &&
      item.clientDocumentNumber === parsed.clientDocumentNumber.trim()
    ) {
      return item
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
