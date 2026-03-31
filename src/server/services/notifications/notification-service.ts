import "server-only"
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
  SystemSeverity,
} from "@prisma/client"
import { env } from "@/lib/config/env"
import { prisma } from "@/lib/prisma/client"

type NotificationMetadata = Prisma.InputJsonValue | null | undefined

type CreateNotificationsInput = {
  userIds: string[]
  title: string
  body: string
  actionUrl?: string | null
  projectId?: string | null
  clientId?: string | null
  metadata?: NotificationMetadata
}

type NotifyProjectRolesInput = Omit<CreateNotificationsInput, "userIds"> & {
  projectId: string
  roleCodes: string[]
  excludeUserIds?: string[]
  requestEmailDelivery?: boolean
}

function uniqueUserIds(values: readonly string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export async function createInAppNotifications(
  input: CreateNotificationsInput
) {
  const userIds = uniqueUserIds(input.userIds)

  if (userIds.length === 0) {
    return { count: 0 }
  }

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      projectId: input.projectId ?? null,
      clientId: input.clientId ?? null,
      channel: NotificationChannel.InApp,
      status: NotificationStatus.Sent,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
      metadata: input.metadata ?? undefined,
    })),
    skipDuplicates: false,
  })

  return { count: userIds.length }
}

export async function notifyProjectRoles(input: NotifyProjectRolesInput) {
  const [systemAssignments, projectAssignments] = await Promise.all([
    prisma.userRole.findMany({
      where: {
        role: {
          code: {
            in: input.roleCodes,
          },
        },
        user: {
          deletedAt: null,
          isActive: true,
        },
      },
      select: {
        userId: true,
      },
    }),
    prisma.userProjectRole.findMany({
      where: {
        projectId: input.projectId,
        role: {
          code: {
            in: input.roleCodes,
          },
        },
        user: {
          deletedAt: null,
          isActive: true,
        },
      },
      select: {
        userId: true,
      },
    }),
  ])

  const excluded = new Set(input.excludeUserIds ?? [])
  const userIds = uniqueUserIds([
    ...systemAssignments.map((item) => item.userId),
    ...projectAssignments.map((item) => item.userId),
  ]).filter((userId) => !excluded.has(userId))

  const result = await createInAppNotifications({
    userIds,
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl,
    projectId: input.projectId,
    clientId: input.clientId,
    metadata: input.metadata,
  })

  if (input.requestEmailDelivery && !env.EMAIL_PROVIDER) {
    await prisma.systemLog.create({
      data: {
        source: "notifications",
        action: "email.skipped",
        message:
          "Email delivery was requested for a project notification, but EMAIL_PROVIDER is not configured.",
        projectId: input.projectId,
        clientId: input.clientId ?? null,
        severity: SystemSeverity.Warning,
        metadata: {
          title: input.title,
          requestedRoleCodes: input.roleCodes,
        },
      },
    })
  }

  return result
}

export async function getNotificationsForUser(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: [{ createdAt: "desc" }],
    take: 50,
    include: {
      project: {
        select: {
          code: true,
          name: true,
        },
      },
      client: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  })

  return {
    notifications,
    unreadCount: notifications.filter((item) => item.status !== NotificationStatus.Read).length,
  }
}

export async function markNotificationRead(input: {
  notificationId: string
  userId: string
}) {
  const result = await prisma.notification.updateMany({
    where: {
      id: input.notificationId,
      userId: input.userId,
    },
    data: {
      status: NotificationStatus.Read,
      readAt: new Date(),
    },
  })

  if (result.count === 0) {
    throw new Error("The selected notification could not be updated.")
  }

  return result
}
