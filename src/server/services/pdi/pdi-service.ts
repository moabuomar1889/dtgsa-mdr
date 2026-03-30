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
import {
  buildSequenceScopeKey,
  renderDocumentNumber,
} from "@/lib/numbering/engine"
import { prisma } from "@/lib/prisma/client"
import { seedWorkflowStepsForRevision } from "@/server/services/workflow/workflow-service"

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

function buildCustomScopeKey(input: {
  projectId: string
  disciplineCode: string
  documentTypeCode: string
}) {
  return `PROJECT:${input.projectId}|DISCIPLINE:${input.disciplineCode}|DOC_TYPE:${input.documentTypeCode}`
}

async function resolveNumberingRule(projectId: string, clientId: string) {
  const include = {
    tokens: {
      orderBy: [{ order: "asc" as const }],
    },
  }

  const projectRule = await prisma.numberingRule.findFirst({
    where: {
      projectId,
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include,
  })

  if (projectRule) {
    return projectRule
  }

  const clientRule = await prisma.numberingRule.findFirst({
    where: {
      clientId,
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include,
  })

  if (clientRule) {
    return clientRule
  }

  const globalRule = await prisma.numberingRule.findFirst({
    where: {
      scopeLevel: ScopeLevel.Global,
      scopeKey: GLOBAL_SCOPE_KEY,
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include,
  })

  if (!globalRule) {
    throw new Error("No active numbering rule is available for this project.")
  }

  return globalRule
}

export async function getPdiOverview() {
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

  const [discipline, documentTypeCategory, releasePurpose, numberingRule] =
    await Promise.all([
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
      resolveNumberingRule(project.id, project.client.id),
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

  const customScopeKey = buildCustomScopeKey({
    projectId: project.id,
    disciplineCode: discipline.code,
    documentTypeCode: documentTypeCategory.code,
  })

  const scopeKey = buildSequenceScopeKey(numberingRule.sequenceScope, {
    projectId: project.id,
    projectCode: project.code,
    disciplineCode: discipline.code,
    documentTypeCode: documentTypeCategory.code,
    customScopeKey,
  })

  return prisma.$transaction(async (tx) => {
    const register =
      project.pdiRegister ??
      (await tx.pdiRegister.create({
        data: {
          projectId: project.id,
        },
      }))

    const sequence = await tx.numberingSequence.upsert({
      where: {
        ruleId_scopeKey: {
          ruleId: numberingRule.id,
          scopeKey,
        },
      },
      update: {
        currentValue: {
          increment: 1,
        },
      },
      create: {
        ruleId: numberingRule.id,
        scopeKey,
        currentValue: 1,
      },
    })

    const dtgsaDocumentNumber = renderDocumentNumber({
      formatString: numberingRule.formatString,
      separator: numberingRule.separator,
      padding: numberingRule.padding,
      tokens: numberingRule.tokens.map((token) => ({
        key: token.key,
        order: token.order,
        padding: token.padding,
        separator: token.separator,
        tokenType: token.tokenType,
        valueTemplate: token.valueTemplate,
        isOptional: token.isOptional,
      })),
      sequenceValue: sequence.currentValue,
      context: {
        clientCode: project.client.code,
        projectCode: project.code,
        projectId: project.id,
        disciplineCode: discipline.code,
        documentTypeCode: documentTypeCategory.code,
        releasePurposeCode: releasePurpose.code,
        revision: parsed.revision,
        customScopeKey,
      },
    })

    const pdiItem = await tx.pdiItem.create({
      data: {
        registerId: register.id,
        projectId: project.id,
        disciplineId: discipline.id,
        documentTypeCategoryId: documentTypeCategory.id,
        releasePurposeId: releasePurpose.id,
        numberingRuleId: numberingRule.id,
        dtgsaDocumentNumber,
        title: parsed.title.trim(),
        revision: parsed.revision.trim(),
        remarks: parsed.remarks?.trim() || null,
        tags: normalizeTags(parsed.tags),
      },
    })

    await tx.auditLog.create({
      data: {
        action: "pdi.item.create",
        entityType: "PdiItem",
        entityId: pdiItem.id,
        projectId: project.id,
        clientId: project.client.id,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          dtgsaDocumentNumber,
          title: pdiItem.title,
          disciplineCode: discipline.code,
          documentTypeCode: documentTypeCategory.code,
          releasePurposeCode: releasePurpose.code,
          sequenceScopeKey: scopeKey,
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

    const nextStatus = item.clientDocumentNumber
      ? PdiStatus.ClientNumberReceived
      : PdiStatus.ClientNumberPending

    const updated = await tx.pdiItem.update({
      where: {
        id: item.id,
      },
      data: {
        status: nextStatus,
      },
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

    const updated = await tx.pdiItem.update({
      where: {
        id: item.id,
      },
      data: {
        clientDocumentNumber: parsed.clientDocumentNumber.trim(),
        status: PdiStatus.ClientNumberReceived,
      },
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

    if (item.mdrDocument) {
      throw new Error("This PDI item has already been promoted into the MDR.")
    }

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

    await tx.pdiItem.update({
      where: {
        id: item.id,
      },
      data: {
        status: PdiStatus.ConvertedToMdr,
      },
    })

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
