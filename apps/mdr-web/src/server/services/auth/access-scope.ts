import "server-only"
import { ROLE_CODES } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const GLOBAL_ACCESS_ROLES = new Set<string>([
  ROLE_CODES.superAdmin,
  ROLE_CODES.systemAdmin,
  ROLE_CODES.documentControlAdmin,
  ROLE_CODES.documentControlUser,
])

export function hasGlobalProjectAccess(user: CurrentAppUser) {
  return user.userRoles.some((entry) => GLOBAL_ACCESS_ROLES.has(entry.role.code))
}

export async function resolveAccessibleProjectIds(user: CurrentAppUser) {
  if (hasGlobalProjectAccess(user)) {
    const projects = await prisma.project.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    })

    return projects.map((project) => project.id)
  }

  return Array.from(
    new Set(
      user.projectRoles
        .filter((entry) => entry.projectId)
        .map((entry) => entry.projectId)
    )
  )
}

export function getProjectRoleCodes(user: CurrentAppUser, projectId: string) {
  return user.projectRoles
    .filter((entry) => entry.projectId === projectId)
    .map((entry) => entry.role.code)
}
