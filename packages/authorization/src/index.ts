export const ROLE_CODES = {
  superAdmin: "super_admin",
  systemAdmin: "system_admin",
  documentControlAdmin: "dtgsa_dc_admin",
  documentControlUser: "dtgsa_dc_user",
  disciplineUser: "discipline_user",
  reviewer: "reviewer",
  approver: "approver",
  projectViewer: "project_viewer",
  clientDocumentControlUser: "client_dc_user",
} as const

export const PERMISSIONS = {
  platformManage: "platform.manage",
  usersManage: "users.manage",
  rolesManage: "roles.manage",
  clientsManage: "clients.manage",
  projectsManage: "projects.manage",
  mastersManage: "masters.manage",
  numberingManage: "numbering.manage",
  templatesManage: "templates.manage",
  auditView: "audit.view",
  pdiManage: "pdi.manage",
  pdiCollaborate: "pdi.collaborate",
  mdrManage: "mdr.manage",
  workflowPrepare: "workflow.prepare",
  workflowReview: "workflow.review",
  workflowApprove: "workflow.approve",
  dcCheck: "workflow.dc_check",
  transmittalsManage: "transmittals.manage",
  clientRepliesManage: "client_replies.manage",
  driveManage: "drive.manage",
  notificationsManage: "notifications.manage",
  dashboardView: "dashboard.view",
} as const

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES]
export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ROLE_PERMISSION_MAP: Record<RoleCode, PermissionCode[]> = {
  [ROLE_CODES.superAdmin]: Object.values(PERMISSIONS),
  [ROLE_CODES.systemAdmin]: [
    PERMISSIONS.platformManage,
    PERMISSIONS.usersManage,
    PERMISSIONS.rolesManage,
    PERMISSIONS.clientsManage,
    PERMISSIONS.projectsManage,
    PERMISSIONS.mastersManage,
    PERMISSIONS.numberingManage,
    PERMISSIONS.templatesManage,
    PERMISSIONS.auditView,
    PERMISSIONS.dashboardView,
  ],
  [ROLE_CODES.documentControlAdmin]: [
    PERMISSIONS.clientsManage,
    PERMISSIONS.projectsManage,
    PERMISSIONS.pdiManage,
    PERMISSIONS.mdrManage,
    PERMISSIONS.dcCheck,
    PERMISSIONS.transmittalsManage,
    PERMISSIONS.clientRepliesManage,
    PERMISSIONS.driveManage,
    PERMISSIONS.notificationsManage,
    PERMISSIONS.dashboardView,
  ],
  [ROLE_CODES.documentControlUser]: [
    PERMISSIONS.pdiManage,
    PERMISSIONS.mdrManage,
    PERMISSIONS.dcCheck,
    PERMISSIONS.transmittalsManage,
    PERMISSIONS.clientRepliesManage,
    PERMISSIONS.notificationsManage,
    PERMISSIONS.dashboardView,
  ],
  [ROLE_CODES.disciplineUser]: [
    PERMISSIONS.workflowPrepare,
    PERMISSIONS.mdrManage,
    PERMISSIONS.dashboardView,
  ],
  [ROLE_CODES.reviewer]: [
    PERMISSIONS.workflowReview,
    PERMISSIONS.dashboardView,
  ],
  [ROLE_CODES.approver]: [
    PERMISSIONS.workflowApprove,
    PERMISSIONS.dashboardView,
  ],
  [ROLE_CODES.projectViewer]: [PERMISSIONS.dashboardView],
  [ROLE_CODES.clientDocumentControlUser]: [
    PERMISSIONS.pdiCollaborate,
    PERMISSIONS.dashboardView,
  ],
}

type AuthorizationInput = {
  required: PermissionCode | PermissionCode[]
  systemRoles?: readonly string[]
  projectRoles?: readonly string[]
}

function isRoleCode(value: string): value is RoleCode {
  return Object.values(ROLE_CODES).includes(value as RoleCode)
}

export function expandPermissionsFromRoles(roleCodes: readonly string[] = []) {
  const grantedPermissions = new Set<PermissionCode>()

  for (const roleCode of roleCodes) {
    if (!isRoleCode(roleCode)) {
      continue
    }

    for (const permission of ROLE_PERMISSION_MAP[roleCode]) {
      grantedPermissions.add(permission)
    }
  }

  return grantedPermissions
}

export function hasPermission({
  required,
  systemRoles = [],
  projectRoles = [],
}: AuthorizationInput) {
  const requiredPermissions = Array.isArray(required) ? required : [required]
  const grantedPermissions = new Set<PermissionCode>([
    ...expandPermissionsFromRoles(systemRoles),
    ...expandPermissionsFromRoles(projectRoles),
  ])

  return requiredPermissions.every((permission) =>
    grantedPermissions.has(permission)
  )
}

export function hasAnyPermission({
  required,
  systemRoles = [],
  projectRoles = [],
}: AuthorizationInput) {
  const requiredPermissions = Array.isArray(required) ? required : [required]
  const grantedPermissions = new Set<PermissionCode>([
    ...expandPermissionsFromRoles(systemRoles),
    ...expandPermissionsFromRoles(projectRoles),
  ])

  return requiredPermissions.some((permission) =>
    grantedPermissions.has(permission)
  )
}
