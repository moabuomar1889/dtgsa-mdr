import { getUserAdminOverview } from "@/server/services/admin/user-admin-service"
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
  const overview = await getUserAdminOverview()
  const projectAssignments = overview.users.reduce(
    (sum, user) => sum + user.projectRoles.length,
    0
  )
  const signatureProfiles = overview.users.filter(
    (user) => user.signatureProfile !== null
  ).length

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-line bg-panel">
          <CardHeader className="border-line bg-head gap-2 border-b">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
                Users & Roles
              </Badge>
              <Badge variant="outline">RBAC foundation</Badge>
            </div>
            <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
              Seeded RBAC is now visible with system-role and project-role
              coverage.
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              The role and permission matrix is loaded from the real database.
              User creation flows and signature management will be added next,
              but the access model, permission catalog, and project-scoped role
              structure are already in place.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Users</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {overview.users.length}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Roles</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {overview.roles.length}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Project assignments</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {projectAssignments}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Signature profiles</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {signatureProfiles}
              </p>
            </div>
          </CardContent>
        </Card>

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

      <Card className="border-line bg-panel">
        <CardHeader>
          <CardTitle className="text-lg">Role matrix</CardTitle>
          <CardDescription>
            System roles and project roles are both supported. Each role expands
            into a seeded permission set.
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

      <Card className="border-line bg-panel">
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
    </div>
  )
}
