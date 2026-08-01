import "server-only"

import {
  WorkRegisterActivityKind,
  type WorkRegisterCategory,
  WorkRegisterStatus,
  type Prisma,
} from "@prisma/client"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import {
  splitEvidenceLines,
  workRegisterCommentSchema,
  workRegisterCreateSchema,
  workRegisterUpdateSchema,
} from "@/lib/forms/work-register"
import { prisma } from "@/lib/prisma/client"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import {
  assertUserHasAnyPermission,
  userHasAnyPermission,
} from "@/server/services/auth/permission-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

export type WorkRegisterFilters = {
  status?: WorkRegisterStatus
  category?: WorkRegisterCategory
  query?: string
  page?: number
}

function assertRegisterManager(actor: CurrentAppUser) {
  assertUserHasAnyPermission(actor, PERMISSIONS.platformManage)
}

export async function getWorkRegisterOverview(
  actor: CurrentAppUser,
  filters: WorkRegisterFilters
) {
  assertUserHasAnyPermission(actor, PERMISSIONS.dashboardView)

  const query = filters.query?.trim().slice(0, 120)
  const page = Math.max(1, Math.floor(filters.page ?? 1))
  const pageSize = 20
  const where: Prisma.WorkRegisterItemWhereInput = {
    status: filters.status,
    category: filters.category,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { area: { contains: query, mode: "insensitive" } },
            { workPack: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  }
  const canManage = userHasAnyPermission(actor, PERMISSIONS.platformManage)

  const [items, total, groupedStatuses, assignees] = await Promise.all([
    prisma.workRegisterItem.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { sequence: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        reporter: { select: { id: true, fullName: true } },
        assignee: { select: { id: true, fullName: true } },
        activities: {
          orderBy: { createdAt: "asc" },
          include: {
            actor: { select: { id: true, fullName: true } },
          },
        },
      },
    }),
    prisma.workRegisterItem.count({ where }),
    prisma.workRegisterItem.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    canManage
      ? prisma.user.findMany({
          where: { isActive: true, deletedAt: null },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
  ])

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    canManage,
    assignees,
    statusCounts: Object.fromEntries(
      groupedStatuses.map((entry) => [entry.status, entry._count._all])
    ) as Partial<Record<WorkRegisterStatus, number>>,
  }
}

export async function createWorkRegisterItem(
  actor: CurrentAppUser,
  input: unknown
) {
  assertUserHasAnyPermission(actor, PERMISSIONS.dashboardView)
  const parsed = workRegisterCreateSchema.parse(input)

  return prisma.$transaction(async (tx) => {
    const item = await tx.workRegisterItem.create({
      data: {
        title: parsed.title,
        description: parsed.description,
        area: parsed.area || null,
        category: parsed.category,
        priority: parsed.priority,
        reporterUserId: actor.id,
      },
    })
    await tx.workRegisterActivity.create({
      data: {
        itemId: item.id,
        actorUserId: actor.id,
        kind: WorkRegisterActivityKind.Created,
        body: "Reported this item.",
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "work_register.item_created",
        entityType: "WorkRegisterItem",
        entityId: item.id,
        afterSnapshot: {
          sequence: item.sequence,
          category: item.category,
          priority: item.priority,
          status: item.status,
        },
      },
    })
    return item
  })
}

export async function addWorkRegisterComment(
  actor: CurrentAppUser,
  input: unknown
) {
  assertUserHasAnyPermission(actor, PERMISSIONS.dashboardView)
  const parsed = workRegisterCommentSchema.parse(input)
  const item = await prisma.workRegisterItem.findUnique({
    where: { id: parsed.itemId },
    select: { id: true },
  })
  if (!item) {
    throw new Error("The work-register item was not found.")
  }

  return prisma.$transaction(async (tx) => {
    const activity = await tx.workRegisterActivity.create({
      data: {
        itemId: item.id,
        actorUserId: actor.id,
        kind: WorkRegisterActivityKind.Comment,
        body: parsed.body,
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "work_register.comment_added",
        entityType: "WorkRegisterItem",
        entityId: item.id,
        metadata: { activityId: activity.id },
      },
    })
    return activity
  })
}

export async function updateWorkRegisterItem(
  actor: CurrentAppUser,
  input: unknown
) {
  assertRegisterManager(actor)
  const parsed = workRegisterUpdateSchema.parse(input)
  const current = await prisma.workRegisterItem.findUnique({
    where: { id: parsed.itemId },
  })
  if (!current) {
    throw new Error("The work-register item was not found.")
  }
  if (parsed.assigneeUserId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: parsed.assigneeUserId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!assignee) {
      throw new Error("The selected work-register owner is not active.")
    }
  }

  const now = new Date()
  const statusChanged = current.status !== parsed.status
  const fileReferences = splitEvidenceLines(parsed.fileReferences ?? "")
  const testEvidence = splitEvidenceLines(parsed.testEvidence ?? "")

  return prisma.$transaction(async (tx) => {
    const updated = await tx.workRegisterItem.update({
      where: { id: current.id },
      data: {
        status: parsed.status,
        priority: parsed.priority,
        category: parsed.category,
        workPack: parsed.workPack || null,
        assigneeUserId: parsed.assigneeUserId || null,
        rootCause: parsed.rootCause || null,
        fixSummary: parsed.fixSummary || null,
        fileReferences,
        testEvidence,
        commitSha: parsed.commitSha || null,
        deploymentStatus: parsed.deploymentStatus,
        remainingRisks: parsed.remainingRisks || null,
        startedAt:
          parsed.status !== WorkRegisterStatus.Reported
            ? (current.startedAt ?? now)
            : current.startedAt,
        fixedAt:
          parsed.status === WorkRegisterStatus.Fixed ||
          parsed.status === WorkRegisterStatus.Verified ||
          parsed.status === WorkRegisterStatus.Closed
            ? (current.fixedAt ?? now)
            : current.fixedAt,
        verifiedAt:
          parsed.status === WorkRegisterStatus.Verified ||
          parsed.status === WorkRegisterStatus.Closed
            ? (current.verifiedAt ?? now)
            : current.verifiedAt,
        closedAt:
          parsed.status === WorkRegisterStatus.Closed
            ? (current.closedAt ?? now)
            : current.closedAt,
      },
    })
    await tx.workRegisterActivity.create({
      data: {
        itemId: current.id,
        actorUserId: actor.id,
        kind: statusChanged
          ? WorkRegisterActivityKind.StatusChanged
          : WorkRegisterActivityKind.EvidenceUpdated,
        body: parsed.updateNote,
        metadata: statusChanged
          ? { fromStatus: current.status, toStatus: parsed.status }
          : { status: parsed.status },
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: statusChanged
          ? "work_register.status_changed"
          : "work_register.evidence_updated",
        entityType: "WorkRegisterItem",
        entityId: current.id,
        beforeSnapshot: {
          status: current.status,
          priority: current.priority,
          deploymentStatus: current.deploymentStatus,
        },
        afterSnapshot: {
          status: updated.status,
          priority: updated.priority,
          deploymentStatus: updated.deploymentStatus,
          commitSha: updated.commitSha,
        },
      },
    })
    return updated
  })
}
