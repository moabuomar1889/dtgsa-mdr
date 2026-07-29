import "server-only"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

export async function getAuditOverview(user: CurrentAppUser) {
  const allowed = hasAnyPermission({
    required: PERMISSIONS.auditView,
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: user.projectRoles.map((item) => item.role.code),
  })

  if (!allowed) {
    return {
      allowed: false,
      auditLogs: [],
      systemLogs: [],
    }
  }

  const [auditLogs, systemLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        isHidden: false,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      include: {
        actorUser: {
          select: {
            fullName: true,
            email: true,
          },
        },
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
    }),
    prisma.systemLog.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      include: {
        actorUser: {
          select: {
            fullName: true,
            email: true,
          },
        },
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
    }),
  ])

  return {
    allowed: true,
    auditLogs,
    systemLogs,
  }
}
