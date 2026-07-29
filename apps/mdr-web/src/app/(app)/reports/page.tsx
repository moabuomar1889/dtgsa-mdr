import Link from "next/link"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getReportingOverview } from "@/server/services/reports/reporting-service"
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

export default async function ReportsPage() {
  const user = await requireCurrentAppUser()
  const overview = await getReportingOverview(user)

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
              Reporting
            </Badge>
            <Badge variant="outline">Project, discipline, workflow, reply metrics</Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Reporting now summarizes live project delivery metrics, workflow distribution, reply states, and overdue operational pressure points.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            These views are built from the same production entities driving PDI, MDR, transmittals, and replies, so the numbers stay aligned with the operating workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Projects</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.counts.projects}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Current revisions</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.counts.currentRevisions}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Transmittals</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.counts.transmittals}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Replies</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.counts.replies}</p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Project dashboard rows</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.projectRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>MDR</TableHead>
                    <TableHead>Ready</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Replies</TableHead>
                    <TableHead>Transmittals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.projectRows.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/projects/${project.id}`}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {project.code} - {project.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">{project.clientName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{project.mdrDocuments}</TableCell>
                      <TableCell>{project.readyToSubmit}</TableCell>
                      <TableCell>{project.submitted}</TableCell>
                      <TableCell>{project.replies}</TableCell>
                      <TableCell>{project.sentTransmittals}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                No reportable projects are visible in your access scope yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Overdue pressure points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.overdueRows.length > 0 ? (
              overview.overdueRows.map((row, index) => (
                <div
                  key={`${row.category}-${row.label}-${index}`}
                  className="rounded-2xl border border-border/60 bg-background/80 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{row.label}</p>
                    <Badge variant="outline">{row.category}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{row.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {row.date.toLocaleString("en-US")}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                No overdue workflow or transmittal rows are currently surfaced.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Workflow distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.workflowBreakdown.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <p className="font-medium">{row.label}</p>
                <Badge variant="outline">{row.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Client reply states</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.replyBreakdown.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <p className="font-medium">{row.label}</p>
                <Badge variant="outline">{row.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Discipline load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.disciplineBreakdown.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <p className="font-medium">{row.label}</p>
                <Badge variant="outline">{row.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
