import "server-only"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"

export async function requireIdentityAdministrator() {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, [
    PERMISSIONS.usersManage,
    PERMISSIONS.rolesManage,
  ])
  return actor
}

export async function getIdentityAdminOverview() {
  await requireIdentityAdministrator()
  const [
    mappings,
    invitations,
    syncRuns,
    linkReviews,
    roles,
    clients,
    projects,
    departments,
  ] = await Promise.all([
    prisma.googleGroupMapping.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    }),
    prisma.externalPortalInvitation.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        identity: {
          include: {
            identity: {
              include: { user: true },
            },
          },
        },
      },
    }),
    prisma.directorySyncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    prisma.identityLinkReview.findMany({
      where: { status: "Pending" },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.role.findMany({ orderBy: { code: "asc" } }),
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { code: "asc" },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { code: "asc" },
    }),
    prisma.department.findMany({ orderBy: { code: "asc" } }),
  ])
  return {
    mappings,
    invitations,
    syncRuns,
    linkReviews,
    roles,
    clients,
    projects,
    departments,
  }
}

export async function resolveIdentityLinkReview(input: {
  actorUserId: string
  reviewId: string
  selectedUserId: string
}) {
  const review = await prisma.identityLinkReview.findUnique({
    where: { id: input.reviewId },
  })
  if (!review || review.status !== "Pending") {
    throw new Error("Identity link review is no longer pending.")
  }
  const candidateUserIds = Array.isArray(review.candidateUserIds)
    ? review.candidateUserIds.filter(
        (candidate): candidate is string => typeof candidate === "string"
      )
    : []
  if (!candidateUserIds.includes(input.selectedUserId)) {
    throw new Error("Selected user is not an approved review candidate.")
  }
  const user = await prisma.user.findFirst({
    where: {
      id: input.selectedUserId,
      deletedAt: null,
    },
  })
  if (!user) {
    throw new Error("Selected user does not exist.")
  }

  return prisma.$transaction(async (tx) => {
    const resolved = await tx.identityLinkReview.update({
      where: { id: review.id },
      data: {
        status: "Approved",
        resolvedAt: new Date(),
        resolvedByUserId: input.actorUserId,
        resolution: {
          selectedUserId: user.id,
          method: "admin_review_then_fresh_oidc",
        },
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: "identity.google.link_review.approved",
        entityType: "IdentityLinkReview",
        entityId: review.id,
        afterSnapshot: {
          selectedUserId: user.id,
          subjectHash: review.subjectHash,
        },
      },
    })
    return resolved
  })
}
