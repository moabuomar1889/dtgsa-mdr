import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { discoverSharedDriveProjectFolders } from "@/server/services/projects/shared-drive-project-discovery"

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
  const discovery = await discoverSharedDriveProjectFolders()
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
              Project folders are discovered directly from the Google Workspace
              Shared Drive.
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              The system scans the configured Projects folder, keeps only
              folders that start with <code>{discovery.scanPrefix ?? "PRJ-"}</code>
              and three digits, then highlights the folders that have not been
              initiated in the application yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-3">
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
              <p className="text-sm text-muted-foreground">Already initiated</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {discovery.linkedFolders.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Drive Source</CardTitle>
            <CardDescription>
              The project creator chooses from folders under the configured
              Shared Drive projects directory.
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
                Projects Folder
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
          <CardTitle className="text-lg">Drive Discovery Result</CardTitle>
          <CardDescription>
            {isReady
              ? "These folders were found in Google Drive and filtered by the PRJ-XXX naming rule."
              : discovery.message ?? "Google Drive discovery is waiting for configuration."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isReady ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Code</TableHead>
                  <TableHead>Folder Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Modified</TableHead>
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
                "Drive discovery could not run yet. Provide the Shared Drive configuration and confirm service-account access."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
