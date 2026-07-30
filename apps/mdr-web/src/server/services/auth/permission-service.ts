import "server-only"
import {
  PERMISSIONS,
  expandPermissionsFromRoles,
  hasAnyPermission,
  type PermissionCode,
} from "@/lib/permissions/rbac"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>
type RequiredPermission = PermissionCode | PermissionCode[]

export function getUserPermissions(user: CurrentAppUser) {
  return Array.from(
    expandPermissionsFromRoles([
      ...user.userRoles.map((item) => item.role.code),
      ...user.projectRoles.map((item) => item.role.code),
    ])
  )
}

export function userHasAnyPermission(
  user: CurrentAppUser,
  required: RequiredPermission,
  projectId?: string
) {
  return hasAnyPermission({
    required,
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: projectId
      ? user.projectRoles
          .filter((item) => item.projectId === projectId)
          .map((item) => item.role.code)
      : user.projectRoles.map((item) => item.role.code),
  })
}

export function assertUserHasAnyPermission(
  user: CurrentAppUser,
  required:
    | Array<(typeof PERMISSIONS)[keyof typeof PERMISSIONS]>
    | (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
  projectId?: string
) {
  if (!userHasAnyPermission(user, required, projectId)) {
    throw new Error("You do not have permission to perform this action.")
  }
}
