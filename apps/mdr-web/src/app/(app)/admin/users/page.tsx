import { PERMISSIONS } from "@/lib/permissions/rbac"
import { getUserAdminOverview } from "@/server/services/admin/user-admin-service"
import { RegisterWorkspace } from "@/components/app/register-workspace"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { Badge } from "@/components/dtg/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/dtg/table"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const user = await requireCurrentAppUser()
  requireUserHasAnyPermission(user, [
    PERMISSIONS.usersManage,
    PERMISSIONS.rolesManage,
  ])
  const overview = await getUserAdminOverview()
  const projectAssignments = overview.users.reduce(
    (sum, user) => sum + user.projectRoles.length,
    0
  )
  const signatureProfiles = overview.users.filter(
    (user) => user.signatureProfile !== null
  ).length

  return (
    <RegisterWorkspace
      eyebrow="Access control"
      title="Users & roles"
      description="Review users first, then consult the role and permission model only when access needs investigation."
      metrics={[
        { label: "Users", value: overview.users.length },
        { label: "Roles", value: overview.roles.length },
        { label: "Assignments", value: projectAssignments },
        { label: "Signatures", value: signatureProfiles },
      ]}
    >
      <details className="order-3">
        <summary className="border-line bg-panel hover:bg-raise cursor-pointer rounded-[10px] border px-4 py-3 text-sm font-semibold">
          Permission catalog
        </summary>
        <section className="mt-3 grid gap-4">
          <Card className="border-line bg-panel">
            <CardHeader>
              <CardTitle className="text-lg">Permission catalog</CardTitle>
              <CardDescription>
                Permissions are grouped and then mapped into roles and project
                assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="border-line bg-raise rounded-[9px] border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{permission.name}</p>
                    <Badge variant="outline">{permission.group}</Badge>
                  </div>
                  <p className="text-soft mt-1 font-mono text-xs">
                    {permission.code}
                  </p>
                  <p className="text-soft mt-2 text-sm">
                    {permission.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </details>

      <details className="order-2">
        <summary className="border-line bg-panel hover:bg-raise cursor-pointer rounded-[10px] border px-4 py-3 text-sm font-semibold">
          Role matrix
        </summary>
        <Card className="border-line bg-panel mt-3">
          <CardHeader>
            <CardTitle className="text-lg">Role matrix</CardTitle>
            <CardDescription>
              System roles and project roles are both supported. Each role
              expands into a seeded permission set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>System</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{role.name}</span>
                        <span className="text-soft font-mono text-xs">
                          {role.code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {role._count.userRoles + role._count.projectRoles}
                    </TableCell>
                    <TableCell>{role.rolePermissions.length}</TableCell>
                    <TableCell>
                      <Badge variant={role.isSystem ? "default" : "outline"}>
                        {role.isSystem ? "System" : "Operational"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </details>

      <Card className="border-line bg-panel order-1">
        <CardHeader>
          <CardTitle className="text-lg">User register</CardTitle>
          <CardDescription>
            This will expand into the full user-management flow in the next
            slice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Global roles</TableHead>
                  <TableHead>Project roles</TableHead>
                  <TableHead>Signature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{user.fullName}</span>
                        <span className="text-soft text-xs">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.userRoles.length > 0 ? (
                          user.userRoles.map((item) => (
                            <Badge key={item.id} variant="outline">
                              {item.role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-soft text-sm">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.projectRoles.length > 0 ? (
                          user.projectRoles.map((item) => (
                            <Badge key={item.id} variant="outline">
                              {item.project.code} / {item.role.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-soft text-sm">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.signatureProfile ? "default" : "outline"}
                      >
                        {user.signatureProfile ? "Configured" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
              No platform users are available yet. Provision Google Workspace
              users through the identity administration process, or seed
              synthetic identities in the isolated local acceptance runtime.
            </div>
          )}
        </CardContent>
      </Card>
    </RegisterWorkspace>
  )
}
