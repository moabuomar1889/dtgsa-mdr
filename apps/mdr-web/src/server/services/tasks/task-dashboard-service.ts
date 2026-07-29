import "server-only"
import {
  NotificationStatus,
  WorkflowStatus,
} from "@prisma/client"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { resolveAccessibleProjectIds } from "@/server/services/auth/access-scope"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

function canPerform(
  user: CurrentAppUser,
  permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
  projectId?: string
) {
  return hasAnyPermission({
    required: permission,
    systemRoles: user.userRoles.map((entry) => entry.role.code),
    projectRoles: projectId
      ? user.projectRoles
          .filter((entry) => entry.projectId === projectId)
          .map((entry) => entry.role.code)
      : user.projectRoles.map((entry) => entry.role.code),
  })
}

export async function getTaskDashboard(user: CurrentAppUser) {
  assertUserHasAnyPermission(user, PERMISSIONS.dashboardView)

  const accessibleProjectIds = await resolveAccessibleProjectIds(user)

  const [notifications, signatures, revisions] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 12,
    }),
    prisma.signatureEvent.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [{ signedAt: "desc" }],
      take: 8,
    }),
    accessibleProjectIds.length > 0
      ? prisma.documentRevision.findMany({
          where: {
            deletedAt: null,
            isCurrent: true,
            document: {
              projectId: {
                in: accessibleProjectIds,
              },
              deletedAt: null,
            },
          },
          orderBy: [{ updatedAt: "desc" }],
          include: {
            document: {
              select: {
                dtgsaDocumentNumber: true,
                title: true,
                projectId: true,
                project: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                discipline: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
  ])

  const preparationQueue = revisions.filter(
    (revision) =>
      (revision.workflowStatus === WorkflowStatus.Draft ||
        revision.workflowStatus === WorkflowStatus.Uploaded ||
        revision.workflowStatus === WorkflowStatus.ReviewRejected ||
        revision.workflowStatus === WorkflowStatus.ApprovalRejected ||
        revision.workflowStatus === WorkflowStatus.DcReturnedForCorrection) &&
      canPerform(user, PERMISSIONS.workflowPrepare, revision.document.projectId)
  )

  const reviewQueue = revisions.filter(
    (revision) =>
      revision.workflowStatus === WorkflowStatus.PendingReview &&
      canPerform(user, PERMISSIONS.workflowReview, revision.document.projectId)
  )

  const approvalQueue = revisions.filter(
    (revision) =>
      revision.workflowStatus === WorkflowStatus.PendingApproval &&
      canPerform(user, PERMISSIONS.workflowApprove, revision.document.projectId)
  )

  const dcQueue = revisions.filter(
    (revision) =>
      (revision.workflowStatus === WorkflowStatus.ReadyForDcCheck ||
        revision.workflowStatus === WorkflowStatus.ReadyToSubmit) &&
      canPerform(user, PERMISSIONS.dcCheck, revision.document.projectId)
  )

  const unreadNotifications = notifications.filter(
    (notification) => notification.status !== NotificationStatus.Read
  )

  const byDiscipline = Array.from(
    preparationQueue
      .concat(reviewQueue, approvalQueue, dcQueue)
      .reduce((map, revision) => {
        const current = map.get(revision.document.discipline.code) ?? {
          disciplineCode: revision.document.discipline.code,
          disciplineName: revision.document.discipline.name,
          count: 0,
        }
        current.count += 1
        map.set(revision.document.discipline.code, current)
        return map
      }, new Map<string, { disciplineCode: string; disciplineName: string; count: number }>())
      .values()
  ).sort((left, right) => right.count - left.count)

  return {
    counts: {
      myActions:
        preparationQueue.length +
        reviewQueue.length +
        approvalQueue.length +
        dcQueue.length,
      unreadNotifications: unreadNotifications.length,
      pendingSignatures: preparationQueue.length + reviewQueue.length + approvalQueue.length,
      recentSignatureEvents: signatures.length,
    },
    preparationQueue: preparationQueue.slice(0, 8),
    reviewQueue: reviewQueue.slice(0, 8),
    approvalQueue: approvalQueue.slice(0, 8),
    dcQueue: dcQueue.slice(0, 8),
    unreadNotifications: unreadNotifications.slice(0, 8),
    recentSignatures: signatures,
    disciplineLoad: byDiscipline.slice(0, 8),
  }
}
