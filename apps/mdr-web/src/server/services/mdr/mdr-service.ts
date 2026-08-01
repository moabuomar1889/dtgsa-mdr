import "server-only"
import { prisma } from "@/lib/prisma/client"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

// Mirrors the MDR entry in the sidebar. Hiding the link is presentation only;
// this is the authorization boundary for the register itself.
export const MDR_REGISTER_PERMISSIONS = [
  PERMISSIONS.mdrManage,
  PERMISSIONS.workflowPrepare,
  PERMISSIONS.workflowReview,
  PERMISSIONS.workflowApprove,
  PERMISSIONS.dcCheck,
]

export const MDR_REGISTER_PAGE_SIZE = 50

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

export async function getMdrOverview(
  user: CurrentAppUser,
  page = 1,
  revisionId?: string
) {
  assertUserHasAnyPermission(user, MDR_REGISTER_PERMISSIONS)

  const currentPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const documents = await prisma.mdrDocument.findMany({
    where: {
      deletedAt: null,
      ...(revisionId ? { currentRevisionId: revisionId } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    skip: revisionId ? 0 : (currentPage - 1) * MDR_REGISTER_PAGE_SIZE,
    take: MDR_REGISTER_PAGE_SIZE,
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
          files: {
            where: {
              deletedAt: null,
            },
            orderBy: [{ createdAt: "desc" }],
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

  // One batched read for the whole page instead of a findFirst per document.
  const currentRevisionIds = documents
    .map((document) => document.currentRevision?.id)
    .filter((id): id is string => Boolean(id))

  const signedArtifacts = currentRevisionIds.length
    ? await prisma.generatedArtifactRecord.findMany({
        where: {
          revisionId: { in: currentRevisionIds },
          artifactKind: "SIGNED_INTERNALLY_PDF",
          cleanupStatus: "Available",
          expiresAt: { gt: new Date() },
        },
        orderBy: { generatedAt: "desc" },
        select: { id: true, expiresAt: true, revisionId: true },
      })
    : []

  // `orderBy generatedAt desc` means the first row seen per revision is the
  // newest, matching the previous per-document findFirst semantics.
  const latestSignedArtifactByRevision = new Map<
    string,
    { id: string; expiresAt: Date | null }
  >()
  for (const artifact of signedArtifacts) {
    if (
      artifact.revisionId &&
      !latestSignedArtifactByRevision.has(artifact.revisionId)
    ) {
      latestSignedArtifactByRevision.set(artifact.revisionId, {
        id: artifact.id,
        expiresAt: artifact.expiresAt,
      })
    }
  }

  const mappedDocuments = documents.map((document) => ({
    ...document,
    signedInternalArtifact: document.currentRevision
      ? (latestSignedArtifactByRevision.get(document.currentRevision.id) ??
        null)
      : null,
    currentRevisionFiles: (document.currentRevision?.files ?? []).map(
      (file) => ({
        ...file,
        accessUrl: file.providerKey ? `/api/document-files/${file.id}` : null,
      })
    ),
    permissions: {
      canPrepare: canAct(user, document.projectId, "workflowPrepare"),
      canReview: canAct(user, document.projectId, "workflowReview"),
      canApprove: canAct(user, document.projectId, "workflowApprove"),
      canDcCheck: canAct(user, document.projectId, "dcCheck"),
      canUpload: canAct(user, document.projectId, "workflowPrepare"),
    },
  }))

  // Counts describe the whole register, not the page in hand. Deriving them
  // from `documents` under-reported as soon as the result set was bounded.
  const [statusGroups, awaitingReply, total] = await Promise.all([
    prisma.mdrDocument.groupBy({
      by: ["currentWorkflowStatus"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.mdrDocument.count({
      where: { deletedAt: null, currentClientReplyState: "WaitingClientReply" },
    }),
    prisma.mdrDocument.count({ where: { deletedAt: null } }),
  ])

  const byStatus = new Map(
    statusGroups.map((group) => [
      group.currentWorkflowStatus,
      group._count._all,
    ])
  )

  return {
    documents: mappedDocuments,
    pagination: {
      page: revisionId ? 1 : currentPage,
      pageSize: MDR_REGISTER_PAGE_SIZE,
      total: revisionId ? mappedDocuments.length : total,
      pageCount: revisionId
        ? 1
        : Math.max(1, Math.ceil(total / MDR_REGISTER_PAGE_SIZE)),
    },
    focusedRevisionId: revisionId ?? null,
    counts: {
      total,
      readyForWorkflow:
        (byStatus.get("Draft") ?? 0) + (byStatus.get("Uploaded") ?? 0),
      submittedToClient: byStatus.get("SubmittedToClient") ?? 0,
      awaitingReply,
    },
  }
}
