import "server-only"

import { ScopeLevel, TransmittalStatus, WorkflowStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma/client"

const GLOBAL_SCOPE_KEY = "system"

export async function loadClientReplyOverviewRecords() {
  const [documents, replies] = await Promise.all([
    prisma.mdrDocument.findMany({
      where: {
        deletedAt: null,
        currentWorkflowStatus: WorkflowStatus.SubmittedToClient,
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        project: {
          select: {
            id: true,
            code: true,
            name: true,
            client: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        currentRevision: {
          select: {
            id: true,
            revisionLabel: true,
            revisionIndex: true,
          },
        },
      },
    }),
    prisma.clientReply.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ replyDate: "desc" }],
      include: {
        project: {
          select: {
            code: true,
            name: true,
          },
        },
        document: {
          select: {
            dtgsaDocumentNumber: true,
            title: true,
          },
        },
        submittedRevision: {
          select: {
            revisionLabel: true,
          },
        },
        reviewCode: {
          select: {
            code: true,
            label: true,
          },
        },
        transmittal: {
          select: {
            transmittalNumber: true,
          },
        },
        triggeredRevisions: {
          select: {
            id: true,
            revisionLabel: true,
            document: {
              select: {
                dtgsaDocumentNumber: true,
              },
            },
          },
        },
      },
    }),
  ])

  const projectIds = Array.from(
    new Set(documents.map((item) => item.projectId))
  )
  const clientIds = Array.from(
    new Set(documents.map((item) => item.project.client.id))
  )
  const documentIds = documents.map((item) => item.id)

  const [reviewCodes, transmittalLinks] = await Promise.all([
    prisma.reviewCode.findMany({
      where: {
        isActive: true,
        OR: [
          {
            projectId: {
              in: projectIds,
            },
          },
          {
            clientId: {
              in: clientIds,
            },
            projectId: null,
          },
          {
            scopeLevel: ScopeLevel.Global,
            scopeKey: GLOBAL_SCOPE_KEY,
          },
        ],
      },
      orderBy: [{ displayOrder: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        label: true,
        description: true,
        displayOrder: true,
        requiresResubmittal: true,
        finalizesDocument: true,
        informationalOnly: true,
        projectId: true,
        clientId: true,
        scopeLevel: true,
      },
    }),
    prisma.transmittalItem.findMany({
      where: {
        documentRevision: {
          documentId: {
            in: documentIds,
          },
        },
        transmittal: {
          status: TransmittalStatus.Sent,
        },
      },
      include: {
        transmittal: {
          select: {
            id: true,
            transmittalNumber: true,
            status: true,
          },
        },
        documentRevision: {
          select: {
            documentId: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
  ])

  return {
    documents,
    replies,
    reviewCodes,
    transmittalLinks,
  }
}
