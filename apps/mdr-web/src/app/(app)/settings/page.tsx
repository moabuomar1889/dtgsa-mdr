import { env } from "@/lib/config/env"
import { getSettingsOverview } from "@/server/services/settings/settings-overview"
import { Badge } from "@/components/dtg/badge"
import { AppearanceSettings } from "@/components/dtg/appearance-settings"
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
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <Card>
        <CardContent className="p-4">
          <AppearanceSettings />
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-line bg-panel">
          <CardHeader className="border-line bg-head gap-2 border-b">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
                Settings Hierarchy
              </Badge>
              <Badge variant="outline">Operational view</Badge>
            </div>
            <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
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
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Database authority</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {overview.integrations.databaseAuthority}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Google service account</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {statusLabel(overview.integrations.googleServiceAccount)}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Email provider</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {overview.integrations.emailProvider ?? "Not configured"}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">LibreOffice</p>
              <p className="mt-2 text-lg font-semibold tracking-tight">
                {overview.integrations.libreOfficeConfigured
                  ? "Configured"
                  : "Deferred"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Safe runtime values</CardTitle>
            <CardDescription>
              Only non-secret values are shown here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-xs tracking-[0.18em] uppercase">
                App URL
              </p>
              <p className="mt-2 font-medium break-all">
                {env.NEXT_PUBLIC_APP_URL}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-xs tracking-[0.18em] uppercase">
                Timezone and limits
              </p>
              <p className="text-soft mt-2 text-sm">
                Default timezone: {env.DEFAULT_TIMEZONE}
              </p>
              <p className="text-soft text-sm">
                File upload max: {env.FILE_UPLOAD_MAX_MB} MB
              </p>
              <p className="text-soft text-sm">
                Transmittal max: {env.TRANSMITTAL_MAX_TOTAL_MB} MB
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-xs tracking-[0.18em] uppercase">
                Drive scope
              </p>
              <p className="text-soft mt-2 text-sm break-all">
                Shared Drive: {env.GOOGLE_DRIVE_SHARED_DRIVE_ID ?? "Not set"}
              </p>
              <p className="text-soft text-sm break-all">
                Projects folder:{" "}
                {env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID ??
                  env.GOOGLE_DRIVE_ROOT_FOLDER_ID ??
                  "Not set"}
              </p>
              <p className="text-soft text-sm">
                Prefix filter: {env.GOOGLE_DRIVE_FOLDER_SCAN_PREFIX}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-line bg-panel">
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
                    <TableCell className="text-soft">
                      {check.actorEmail ?? "Unavailable"}
                    </TableCell>
                    <TableCell>
                      {check.sharedDriveVisible ? (
                        <Badge>Visible</Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="outline">Blocked</Badge>
                          <p className="text-soft text-xs">
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
                          <p className="text-soft text-xs">
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
            <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
              Google Drive has not been configured enough to run diagnostics
              yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-line bg-panel">
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
                    <TableCell className="font-medium">
                      {setting.group}
                    </TableCell>
                    <TableCell>{setting.key}</TableCell>
                    <TableCell className="text-soft">
                      {JSON.stringify(setting.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
              No explicit system settings rows have been saved yet. The platform
              is still relying on seeded master data and runtime configuration.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
