import "server-only"
import { prisma } from "@/lib/prisma/client"

export async function getMdrOverview() {
  const documents = await prisma.mdrDocument.findMany({
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
      currentRevision: {
        select: {
          id: true,
          revisionLabel: true,
          workflowStatus: true,
          revisionStatus: true,
          clientReplyState: true,
        },
      },
      sourcePdiItem: {
        select: {
          id: true,
          dtgsaDocumentNumber: true,
          status: true,
        },
      },
      _count: {
        select: {
          revisions: true,
          clientReplies: true,
        },
      },
    },
  })

  return {
    documents,
    counts: {
      total: documents.length,
      readyForWorkflow: documents.filter(
        (document) => document.currentWorkflowStatus === "Draft"
      ).length,
      submittedToClient: documents.filter(
        (document) => document.currentWorkflowStatus === "SubmittedToClient"
      ).length,
      awaitingReply: documents.filter(
        (document) => document.currentClientReplyState === "WaitingClientReply"
      ).length,
    },
  }
}
