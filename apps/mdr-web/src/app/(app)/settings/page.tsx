import { env } from "@/lib/config/env"
import { getSettingsOverview } from "@/server/services/settings/settings-overview"
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

function statusLabel(value: boolean) {
  return value ? "Ready" : "Missing"
}

export default async function SettingsPage() {
  const overview = await getSettingsOverview()

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
                Settings Hierarchy
              </Badge>
              <Badge variant="outline">Operational view</Badge>
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Platform settings, integration readiness, and environment posture
              are now visible in one place.
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              This screen is read-only for now, but it already surfaces the
              current configuration state, integration diagnostics, safe runtime
              values, and system settings rows stored in the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Database authority</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {overview.integrations.databaseAuthority}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Google service account</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {statusLabel(overview.integrations.googleServiceAccount)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Email provider</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {overview.integrations.emailProvider ?? "Not configured"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">LibreOffice</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {overview.integrations.libreOfficeConfigured
                  ? "Configured"
                  : "Deferred"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Safe runtime values</CardTitle>
            <CardDescription>
              Only non-secret values are shown here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                App URL
              </p>
              <p className="mt-2 break-all font-medium">{env.NEXT_PUBLIC_APP_URL}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Timezone and limits
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Default timezone: {env.DEFAULT_TIMEZONE}
              </p>
              <p className="text-sm text-muted-foreground">
                File upload max: {env.FILE_UPLOAD_MAX_MB} MB
              </p>
              <p className="text-sm text-muted-foreground">
                Transmittal max: {env.TRANSMITTAL_MAX_TOTAL_MB} MB
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Drive scope
              </p>
              <p className="mt-2 break-all text-sm text-muted-foreground">
                Shared Drive: {env.GOOGLE_DRIVE_SHARED_DRIVE_ID ?? "Not set"}
              </p>
              <p className="break-all text-sm text-muted-foreground">
                Projects folder:{" "}
                {env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID ??
                  env.GOOGLE_DRIVE_ROOT_FOLDER_ID ??
                  "Not set"}
              </p>
              <p className="text-sm text-muted-foreground">
                Prefix filter: {env.GOOGLE_DRIVE_FOLDER_SCAN_PREFIX}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Google Drive diagnostic</CardTitle>
          <CardDescription>{overview.googleDrive.summary}</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.googleDrive.checks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mode</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Shared Drive</TableHead>
                  <TableHead>Projects Folder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.googleDrive.checks.map((check) => (
                  <TableRow key={check.mode}>
                    <TableCell className="font-medium">{check.mode}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {check.actorEmail ?? "Unavailable"}
                    </TableCell>
                    <TableCell>
                      {check.sharedDriveVisible ? (
                        <Badge>Visible</Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="outline">Blocked</Badge>
                          <p className="text-xs text-muted-foreground">
                            {check.sharedDriveError ?? "Unknown error"}
                          </p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {check.projectFolderVisible ? (
                        <Badge>Visible</Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="outline">Blocked</Badge>
                          <p className="text-xs text-muted-foreground">
                            {check.projectFolderError ?? "Unknown error"}
                          </p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              Google Drive has not been configured enough to run diagnostics yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">System settings rows</CardTitle>
          <CardDescription>
            Stored settings records in the database. Editable hierarchy screens
            will build on this foundation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.systemSettings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.systemSettings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="font-medium">{setting.group}</TableCell>
                    <TableCell>{setting.key}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {JSON.stringify(setting.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              No explicit system settings rows have been saved yet. The platform
              is still relying on seeded master data and runtime configuration.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
