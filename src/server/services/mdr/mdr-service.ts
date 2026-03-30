import "server-only"
import { prisma } from "@/lib/prisma/client"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

function canAct(
  user: CurrentAppUser,
  projectId: string,
  permission: keyof typeof PERMISSIONS
) {
  return hasAnyPermission({
    required: PERMISSIONS[permission],
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: user.projectRoles
      .filter((item) => item.projectId === projectId)
      .map((item) => item.role.code),
  })
}

export async function getMdrOverview(user: CurrentAppUser) {
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
        include: {
          workflowSteps: {
            orderBy: [{ stepOrder: "asc" }],
          },
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
    documents: documents.map((document) => ({
      ...document,
      permissions: {
        canPrepare: canAct(user, document.projectId, "workflowPrepare"),
        canReview: canAct(user, document.projectId, "workflowReview"),
        canApprove: canAct(user, document.projectId, "workflowApprove"),
        canDcCheck: canAct(user, document.projectId, "dcCheck"),
      },
    })),
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
