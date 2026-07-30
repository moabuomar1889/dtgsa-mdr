import { TransmittalStatus } from "@prisma/client"
import {
  createTransmittalAction,
  sendTransmittalAction,
} from "@/server/actions/transmittals"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getTransmittalOverview } from "@/server/services/transmittals/transmittal-overview-service"
import { TransmittalCreateForm } from "@/components/app/transmittal-create-form"
import { SubmitButton } from "@/components/app/submit-button"
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

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / 1024 ** exponent

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function transmittalStatusVariant(status: TransmittalStatus) {
  switch (status) {
    case TransmittalStatus.Sent:
      return "default" as const
    case TransmittalStatus.ReadyToSend:
      return "secondary" as const
    default:
      return "outline" as const
  }
}

export default async function TransmittalsPage() {
  const user = await requireCurrentAppUser()
  const overview = await getTransmittalOverview(user)

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-line bg-panel">
          <CardHeader className="border-line bg-head gap-2 border-b">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
                Transmittal Module
              </Badge>
              <Badge variant="outline">Outbound package control</Badge>
            </div>
            <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
              Approved revisions can now be grouped into real transmittal drafts
              and issued into client-submitted status.
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              This slice validates project grouping, enforces attachment size
              limits, reserves revisions in a transmittal draft, and moves them
              into the client-submitted workflow state once the transmittal is
              sent.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Eligible revisions</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {overview.counts.eligibleDocuments}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Transmittals</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {overview.counts.total}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Ready to send</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {overview.counts.readyToSend}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Sent</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {overview.counts.sent}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Create transmittal</CardTitle>
            <CardDescription>
              Select one project, choose current revisions in ReadyToSubmit, and
              create the outbound draft package.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.projects.length > 0 ? (
              <TransmittalCreateForm
                projects={overview.projects}
                eligibleRevisions={overview.eligibleRevisions}
                action={createTransmittalAction}
              />
            ) : (
              <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                No projects exist yet, so there is nothing available for
                transmittal packaging.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-line bg-panel">
        <CardHeader>
          <CardTitle className="text-lg">Transmittal records</CardTitle>
          <CardDescription>
            Draft, ready, and sent transmittals across initiated projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.transmittals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Transmittal</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.transmittals.map((transmittal) => (
                  <TableRow key={transmittal.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {transmittal.project.code} -{" "}
                          {transmittal.project.name}
                        </span>
                        <span className="text-soft text-xs">
                          {transmittal.project.client.code} -{" "}
                          {transmittal.project.client.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {transmittal.transmittalNumber}
                        </span>
                        <span className="text-soft text-xs">
                          {transmittal.subject}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-64 flex-col gap-1">
                        {transmittal.items.map((item) => (
                          <span
                            key={item.id}
                            className="text-soft text-xs leading-5"
                          >
                            {item.documentRevision.document.dtgsaDocumentNumber}{" "}
                            / Rev {item.documentRevision.revisionLabel} /{" "}
                            {item.documentRevision.document.title}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-40 flex-col gap-2">
                        <Badge
                          variant={transmittalStatusVariant(transmittal.status)}
                        >
                          {transmittal.status}
                        </Badge>
                        {transmittal.status !== TransmittalStatus.Sent ? (
                          <form action={sendTransmittalAction}>
                            <input
                              type="hidden"
                              name="transmittalId"
                              value={transmittal.id}
                            />
                            <SubmitButton
                              label="Mark sent"
                              pendingLabel="Sending"
                              className="w-full"
                            />
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatBytes(transmittal.totalAttachmentBytes)}
                    </TableCell>
                    <TableCell>
                      {transmittal.generatedPdfUrl ? (
                        <a
                          href={transmittal.generatedPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent-txt text-sm font-medium underline-offset-4 hover:underline"
                        >
                          Open PDF
                        </a>
                      ) : (
                        <span className="text-soft text-sm">
                          Not generated yet
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-soft text-sm">
                      {transmittal.sentAt
                        ? transmittal.sentAt.toLocaleString("en-US")
                        : "Not yet sent"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
              No transmittals exist yet. Create the first draft from approved
              MDR revisions above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
