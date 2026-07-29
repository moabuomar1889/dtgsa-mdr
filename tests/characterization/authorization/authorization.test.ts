import assert from "node:assert/strict"
import test from "node:test"
import {
  PERMISSIONS,
  ROLE_CODES,
  expandPermissionsFromRoles,
  hasAnyPermission,
  hasPermission,
} from "../../../src/lib/permissions/rbac"
import { assertUserHasAnyPermission } from "../../../src/server/services/auth/permission-service"

test("super administrators receive the complete permission vocabulary", () => {
  assert.deepEqual(
    [...expandPermissionsFromRoles([ROLE_CODES.superAdmin])].sort(),
    Object.values(PERMISSIONS).sort()
  )
})

test("unknown roles do not grant permissions", () => {
  assert.equal(expandPermissionsFromRoles(["unknown-role"]).size, 0)
})

test("authorization combines system and project roles", () => {
  assert.equal(
    hasPermission({
      required: [PERMISSIONS.workflowReview, PERMISSIONS.dashboardView],
      systemRoles: [ROLE_CODES.projectViewer],
      projectRoles: [ROLE_CODES.reviewer],
    }),
    true
  )
})

test("all-permission and any-permission checks retain distinct behavior", () => {
  const input = {
    required: [PERMISSIONS.workflowReview, PERMISSIONS.workflowApprove],
    projectRoles: [ROLE_CODES.reviewer],
  }

  assert.equal(hasPermission(input), false)
  assert.equal(hasAnyPermission(input), true)
})

test("project permission assertions scope project roles to the requested project", () => {
  const user = {
    userRoles: [],
    projectRoles: [
      {
        projectId: "project-1",
        role: { code: ROLE_CODES.reviewer },
      },
    ],
  } as Parameters<typeof assertUserHasAnyPermission>[0]

  assert.doesNotThrow(() =>
    assertUserHasAnyPermission(user, PERMISSIONS.workflowReview, "project-1")
  )
  assert.throws(
    () =>
      assertUserHasAnyPermission(user, PERMISSIONS.workflowReview, "project-2"),
    /do not have permission/
  )
})
