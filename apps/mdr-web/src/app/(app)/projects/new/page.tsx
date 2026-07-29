import Link from "next/link"
import { createProjectAction } from "@/server/actions/platform-admin"
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
  const [discovery, clients] = await Promise.all([
    discoverSharedDriveProjectFolders(),
    listClientOptions(),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
              Project Onboarding Queue
            </Badge>
            <Badge variant={discovery.status === "ready" ? "default" : "outline"}>
              {discovery.status}
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
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
        <Card className="border-border/70 bg-card/95 shadow-sm">
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
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
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

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Discovery status</CardTitle>
            <CardDescription>
              Current Drive connectivity state for the onboarding flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Mode</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {discovery.status === "ready"
                  ? "Automatic discovery"
                  : "Manual fallback available"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Message</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {discovery.status === "ready"
                  ? `${discovery.availableFolders.length} unlinked project folders are ready for onboarding.`
                  : discovery.message ??
                    "Drive visibility is not ready yet, but manual folder mapping is enabled."}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Configured scope</p>
              <p className="mt-2 break-all text-sm text-muted-foreground">
                Shared Drive: {discovery.sharedDriveId ?? "Not set"}
              </p>
              <p className="break-all text-sm text-muted-foreground">
                Projects folder: {discovery.projectsFolderId ?? "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/95 shadow-sm">
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
                      <TableCell className="font-medium">{folder.code}</TableCell>
                      <TableCell>{folder.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {folder.folderId}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                Every matching Shared Drive folder is already linked in the
                system, or there are no matching folders under the configured
                Projects directory.
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              Automatic discovery is currently blocked, so the form above accepts
              manual folder ID and folder name input until the Shared Drive
              access configuration is corrected.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
