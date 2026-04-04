import "server-only"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

export function assertUserHasAnyPermission(
  user: CurrentAppUser,
  required: Array<(typeof PERMISSIONS)[keyof typeof PERMISSIONS]> | (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
  projectId?: string
) {
  const allowed = hasAnyPermission({
    required,
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: projectId
      ? user.projectRoles
          .filter((item) => item.projectId === projectId)
          .map((item) => item.role.code)
      : user.projectRoles.map((item) => item.role.code),
  })

  if (!allowed) {
    throw new Error("You do not have permission to perform this action.")
  }
}
