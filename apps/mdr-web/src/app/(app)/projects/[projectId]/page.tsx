import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { getProjectDashboard } from "@/server/services/projects/project-dashboard-service"
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
  requireUserHasAnyPermission(user, PERMISSIONS.dashboardView, projectId)

  const overview = await getProjectDashboard(user, projectId)

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <Card className="border-line bg-panel">
        <CardHeader className="border-line bg-head gap-2 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
              Project Dashboard
            </Badge>
            <Badge variant="outline">{overview.project.code}</Badge>
          </div>
          <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
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
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Documents</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {overview.counts.totalDocuments}
            </p>
          </div>
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Ready to submit</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {overview.counts.readyToSubmit}
            </p>
          </div>
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Submitted</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {overview.counts.submitted}
            </p>
          </div>
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Revisions</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {overview.counts.revisions}
            </p>
          </div>
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Transmittals</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {overview.counts.sentTransmittals}
            </p>
          </div>
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Replies</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {overview.counts.replies}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-line bg-panel">
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
                      <TableCell className="font-medium">
                        {row.discipline}
                      </TableCell>
                      <TableCell>{row.documents}</TableCell>
                      <TableCell>{row.readyToSubmit}</TableCell>
                      <TableCell>{row.submitted}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                No discipline-level document activity exists for this project
                yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Workflow distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.workflowBreakdown.length > 0 ? (
              overview.workflowBreakdown.map((row) => (
                <div
                  key={row.label}
                  className="border-line bg-raise flex items-center justify-between rounded-[9px] border p-4"
                >
                  <p className="font-medium">{row.label}</p>
                  <Badge variant="outline">{row.count}</Badge>
                </div>
              ))
            ) : (
              <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                Workflow metrics will appear here as documents enter MDR.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Recent transmittals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.project.transmittals.length > 0 ? (
              overview.project.transmittals.map((transmittal) => (
                <div
                  key={transmittal.id}
                  className="border-line bg-raise rounded-[9px] border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {transmittal.transmittalNumber}
                      </p>
                      <p className="text-soft text-sm">{transmittal.subject}</p>
                    </div>
                    <Badge variant="outline">{transmittal.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                No transmittals have been recorded for this project yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Recent replies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.project.clientReplies.length > 0 ? (
              overview.project.clientReplies.map((reply) => (
                <div
                  key={reply.id}
                  className="border-line bg-raise rounded-[9px] border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {reply.document.dtgsaDocumentNumber} /{" "}
                        {reply.reviewCode.code}
                      </p>
                      <p className="text-soft text-sm">
                        {reply.document.title}
                      </p>
                    </div>
                    <Badge variant="outline">{reply.replyState}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                No client replies have been recorded for this project yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
