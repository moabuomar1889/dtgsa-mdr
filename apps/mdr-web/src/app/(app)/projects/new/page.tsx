import Link from "next/link"
import { createProjectAction } from "@/server/actions/platform-admin"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { listClientOptions } from "@/server/services/clients/client-management"
import { discoverSharedDriveProjectFolders } from "@/server/services/projects/shared-drive-project-discovery"
import { ProjectOnboardingForm } from "@/components/app/project-onboarding-form"
import { Badge } from "@/components/dtg/badge"
import { Button } from "@/components/dtg/button"
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

export default async function NewProjectPage() {
  const user = await requireCurrentAppUser()
  requireUserHasAnyPermission(user, PERMISSIONS.projectsManage)

  const [discovery, clients] = await Promise.all([
    discoverSharedDriveProjectFolders(),
    listClientOptions(),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <Card className="border-line bg-panel">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
              Project Onboarding Queue
            </Badge>
            <Badge
              variant={discovery.status === "ready" ? "default" : "outline"}
            >
              {discovery.status}
            </Badge>
          </div>
          <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
            Create a project by linking it to the correct Shared Drive folder.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            When Google Drive discovery is healthy, users select from unlinked
            <code> PRJ-XXX </code> folders automatically. If Drive visibility is
            still blocked, the same form falls back to manual folder mapping so
            project setup does not stop.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Create project</CardTitle>
            <CardDescription>
              Choose a client first. The selected folder becomes the root Drive
              mapping for the project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clients.length > 0 ? (
              <ProjectOnboardingForm
                clients={clients}
                folders={discovery.availableFolders.map((folder) => ({
                  folderId: folder.folderId,
                  name: folder.name,
                  code: folder.code,
                }))}
                action={createProjectAction}
              />
            ) : (
              <div className="space-y-4">
                <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                  No clients exist yet, so project onboarding is paused until
                  the first client record is created.
                </div>
                <Button asChild>
                  <Link href="/clients">Create first client</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Discovery status</CardTitle>
            <CardDescription>
              Current Drive connectivity state for the onboarding flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Mode</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {discovery.status === "ready"
                  ? "Automatic discovery"
                  : "Manual fallback available"}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Message</p>
              <p className="text-soft mt-2 text-sm leading-6">
                {discovery.status === "ready"
                  ? `${discovery.availableFolders.length} unlinked project folders are ready for onboarding.`
                  : (discovery.message ??
                    "Drive visibility is not ready yet, but manual folder mapping is enabled.")}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Configured scope</p>
              <p className="text-soft mt-2 text-sm break-all">
                Shared Drive: {discovery.sharedDriveId ?? "Not set"}
              </p>
              <p className="text-soft text-sm break-all">
                Projects folder: {discovery.projectsFolderId ?? "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-line bg-panel">
        <CardHeader>
          <CardTitle className="text-lg">Available project folders</CardTitle>
          <CardDescription>
            These are the folders currently eligible for onboarding when Drive
            discovery succeeds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {discovery.status === "ready" ? (
            discovery.availableFolders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project code</TableHead>
                    <TableHead>Folder name</TableHead>
                    <TableHead>Folder ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discovery.availableFolders.map((folder) => (
                    <TableRow key={folder.folderId}>
                      <TableCell className="font-medium">
                        {folder.code}
                      </TableCell>
                      <TableCell>{folder.name}</TableCell>
                      <TableCell className="text-soft font-mono text-xs">
                        {folder.folderId}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                Every matching Shared Drive folder is already linked in the
                system, or there are no matching folders under the configured
                Projects directory.
              </div>
            )
          ) : (
            <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
              Automatic discovery is currently blocked, so the form above
              accepts manual folder ID and folder name input until the Shared
              Drive access configuration is corrected.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
