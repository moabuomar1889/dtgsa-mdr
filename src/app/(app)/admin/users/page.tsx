import { syncSupabaseUsersAction } from "@/server/actions/platform-admin"
import { SubmitButton } from "@/components/app/submit-button"
import { getUserAdminOverview } from "@/server/services/admin/user-admin-service"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
                Users & Roles
              </Badge>
              <Badge variant="outline">RBAC foundation</Badge>
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
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
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Users</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {overview.users.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Roles</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {overview.roles.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Project assignments</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {projectAssignments}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Signature profiles</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {signatureProfiles}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Permission catalog</CardTitle>
            <CardDescription>
              Permissions are grouped and then mapped into roles and project
              assignments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={syncSupabaseUsersAction}>
              <SubmitButton
                label="Sync Supabase users"
                pendingLabel="Syncing users"
                className="w-full"
              />
            </form>
            {overview.permissions.map((permission) => (
              <div
                key={permission.id}
                className="rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{permission.name}</p>
                  <Badge variant="outline">{permission.group}</Badge>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {permission.code}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {permission.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/95 shadow-sm">
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
                      <span className="font-mono text-xs text-muted-foreground">
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

      <Card className="border-border/70 bg-card/95 shadow-sm">
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
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
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
                          <span className="text-sm text-muted-foreground">
                            None
                          </span>
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
                          <span className="text-sm text-muted-foreground">
                            None
                          </span>
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
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              No platform users have been synchronized into the app-domain user
              table yet. The RBAC foundation is ready; the next step is wiring
              Supabase-auth users and signature profiles into this screen.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
