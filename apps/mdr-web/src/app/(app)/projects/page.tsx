import Link from "next/link"
import { listProjects } from "@/server/services/projects/project-management"
import { discoverSharedDriveProjectFolders } from "@/server/services/projects/shared-drive-project-discovery"
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

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown"
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default async function ProjectsPage() {
  const [discovery, projects] = await Promise.all([
    discoverSharedDriveProjectFolders(),
    listProjects(),
  ])
  const isReady = discovery.status === "ready"

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
                Shared Drive Discovery
              </Badge>
              <Badge variant={isReady ? "default" : "outline"}>
                {discovery.status}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Project folders are discovered from the Google Workspace Shared
              Drive and compared against initiated project records.
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              The app scans the configured Projects folder, keeps only folder
              names that match the <code>PRJ-XXX</code> rule, and separates
              folders that are still waiting to be initiated from folders that
              are already linked to project records.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Matching folders</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {discovery.totalMatchingFolders}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Available to onboard</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {discovery.availableFolders.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Already linked</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {discovery.linkedFolders.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Projects in system</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {projects.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Drive source</CardTitle>
            <CardDescription>
              Discovery uses the configured Shared Drive and Projects folder ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Shared Drive
              </p>
              <p className="mt-2 font-medium">{discovery.sharedDriveId ?? "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Projects folder
              </p>
              <p className="mt-2 font-medium">
                {discovery.projectsFolderId ?? "Not set"}
              </p>
            </div>
            <Button asChild className="mt-1">
              <Link href="/projects/new">Open onboarding queue</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Initiated projects</CardTitle>
          <CardDescription>
            Project records already linked in the platform database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Root folder</TableHead>
                  <TableHead>MDR docs</TableHead>
                  <TableHead>Transmittals</TableHead>
                  <TableHead>Dashboard</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {project.code} - {project.name}
                        </span>
                        {project.contractNumber ? (
                          <span className="text-xs text-muted-foreground">
                            Contract: {project.contractNumber}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.client.code} - {project.client.name}
                    </TableCell>
                    <TableCell className="max-w-80 text-muted-foreground">
                      {project.driveMappings[0]?.folderName ?? "Unmapped"}
                    </TableCell>
                    <TableCell>{project._count.mdrDocuments}</TableCell>
                    <TableCell>{project._count.transmittals}</TableCell>
                    <TableCell>
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              No projects have been initiated yet. Use the onboarding queue to
              create the first project record from a Shared Drive folder or by
              manual folder mapping if discovery is still blocked.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Drive discovery result</CardTitle>
          <CardDescription>
            {isReady
              ? "These folders were found in Google Drive and filtered by the configured prefix rule."
              : discovery.message ?? "Google Drive discovery is waiting for configuration."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isReady ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project code</TableHead>
                  <TableHead>Folder name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last modified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...discovery.availableFolders, ...discovery.linkedFolders].map(
                  (folder) => (
                    <TableRow key={folder.folderId}>
                      <TableCell className="font-medium">{folder.code}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{folder.name}</span>
                          {folder.webViewLink ? (
                            <Link
                              href={folder.webViewLink}
                              target="_blank"
                              className="text-xs text-primary underline-offset-4 hover:underline"
                            >
                              Open in Google Drive
                            </Link>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {folder.alreadyInitiated ? (
                          <Badge variant="outline">
                            Linked to {folder.linkedProjectCode}
                          </Badge>
                        ) : (
                          <Badge>Not initiated</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(folder.modifiedTime)}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              {discovery.message ??
                "Drive discovery could not run yet. The system can still continue with manual folder mapping from the onboarding screen."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
