import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getProjectDashboard } from "@/server/services/projects/project-dashboard-service"
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

type ProjectDashboardPageProps = {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectDashboardPage({
  params,
}: ProjectDashboardPageProps) {
  const { projectId } = await params
  const user = await requireCurrentAppUser()
  const overview = await getProjectDashboard(user, projectId)

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
              Project Dashboard
            </Badge>
            <Badge variant="outline">{overview.project.code}</Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {overview.project.code} - {overview.project.name}
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            {overview.project.client.code} - {overview.project.client.name}
            {overview.project.contractNumber
              ? ` / Contract ${overview.project.contractNumber}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Documents</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.counts.totalDocuments}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Ready to submit</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.counts.readyToSubmit}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.counts.submitted}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Revisions</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.counts.revisions}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Transmittals</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.counts.sentTransmittals}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Replies</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.counts.replies}</p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Discipline dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.disciplineRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Discipline</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Ready</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.disciplineRows.map((row) => (
                    <TableRow key={row.discipline}>
                      <TableCell className="font-medium">{row.discipline}</TableCell>
                      <TableCell>{row.documents}</TableCell>
                      <TableCell>{row.readyToSubmit}</TableCell>
                      <TableCell>{row.submitted}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                No discipline-level document activity exists for this project yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Workflow distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.workflowBreakdown.length > 0 ? (
              overview.workflowBreakdown.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 p-4"
                >
                  <p className="font-medium">{row.label}</p>
                  <Badge variant="outline">{row.count}</Badge>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                Workflow metrics will appear here as documents enter MDR.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent transmittals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.project.transmittals.length > 0 ? (
              overview.project.transmittals.map((transmittal) => (
                <div
                  key={transmittal.id}
                  className="rounded-2xl border border-border/60 bg-background/80 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{transmittal.transmittalNumber}</p>
                      <p className="text-sm text-muted-foreground">{transmittal.subject}</p>
                    </div>
                    <Badge variant="outline">{transmittal.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                No transmittals have been recorded for this project yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent replies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.project.clientReplies.length > 0 ? (
              overview.project.clientReplies.map((reply) => (
                <div
                  key={reply.id}
                  className="rounded-2xl border border-border/60 bg-background/80 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {reply.document.dtgsaDocumentNumber} / {reply.reviewCode.code}
                      </p>
                      <p className="text-sm text-muted-foreground">{reply.document.title}</p>
                    </div>
                    <Badge variant="outline">{reply.replyState}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                No client replies have been recorded for this project yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
