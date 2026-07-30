import "server-only"

import { forbidden } from "next/navigation"
import type { PermissionCode } from "@/lib/permissions/rbac"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { userHasAnyPermission } from "@/server/services/auth/permission-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

export function requireUserHasAnyPermission(
  user: CurrentAppUser,
  required: PermissionCode | PermissionCode[],
  projectId?: string
) {
  if (!userHasAnyPermission(user, required, projectId)) {
    forbidden()
  }
}
