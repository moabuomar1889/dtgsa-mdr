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
import { discoverSharedDriveProjectFolders } from "@/server/services/projects/shared-drive-project-discovery"

export const dynamic = "force-dynamic"

export default async function NewProjectPage() {
  const discovery = await discoverSharedDriveProjectFolders()

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
            New projects start by selecting an unlinked folder from the Shared
            Drive.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            This page is the first onboarding checkpoint. It lists folders under
            the configured Projects directory that match the required PRJ-XXX
            naming rule and are not already linked to a project record.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Available project folders</CardTitle>
          <CardDescription>
            The actual project-create form will use this queue so users pick the
            correct Google Drive folder instead of typing a folder ID manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {discovery.status === "ready" ? (
            discovery.availableFolders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Code</TableHead>
                    <TableHead>Folder Name</TableHead>
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
                system, or there are no matching `PRJ-XXX` folders in the
                configured Projects directory.
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              {discovery.message ??
                "Google Drive discovery is not ready yet for project onboarding."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
