import { TransmittalStatus } from "@prisma/client"
import {
  createTransmittalAction,
  sendTransmittalAction,
} from "@/server/actions/transmittals"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getTransmittalOverview } from "@/server/services/transmittals/transmittal-overview-service"
import { TransmittalCreateForm } from "@/components/app/transmittal-create-form"
import { RegisterPanel } from "@/components/app/register-panel"
import { RegisterWorkspace } from "@/components/app/register-workspace"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
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
    <RegisterWorkspace
      eyebrow="Outbound control"
      title="Transmittals"
      description="Build an outbound package from approved revisions, then track its issue status in one register."
      metrics={[
        { label: "Eligible", value: overview.counts.eligibleDocuments },
        { label: "Total", value: overview.counts.total },
        { label: "Ready", value: overview.counts.readyToSend },
        { label: "Sent", value: overview.counts.sent },
      ]}
      actions={[
        {
          label: "New transmittal",
          title: "Create a transmittal",
          description:
            "Select one project and package its ready-to-submit revisions.",
          intent: "create",
          width: "xl",
          panel:
            overview.projects.length > 0 ? (
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
            ),
        },
      ]}
    >
      <RegisterPanel
        title="Transmittal register"
        description="Draft, ready, and sent packages across active projects."
      >
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
                        {transmittal.project.code} - {transmittal.project.name}
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
                          {item.documentRevision.document.dtgsaDocumentNumber} /
                          Rev {item.documentRevision.revisionLabel} /{" "}
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
            No transmittals exist yet. Create the first draft from approved MDR
            revisions above.
          </div>
        )}
      </RegisterPanel>
    </RegisterWorkspace>
  )
}
