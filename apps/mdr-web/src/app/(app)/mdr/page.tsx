import Link from "next/link"
import {
  approveApproveRevisionAction,
  approveRejectRevisionAction,
  dcApproveRevisionAction,
  dcRejectRevisionAction,
  prepareRevisionAction,
  reviewApproveRevisionAction,
  reviewRejectRevisionAction,
} from "@/server/actions/workflow"
import {
  generateMergedRevisionPackageAction,
  generateRevisionCoverSheetsAction,
  requestSignedInternalDownloadAction,
  uploadRevisionFileAction,
} from "@/server/actions/mdr"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { RegisterPagination } from "@/components/app/register-pagination"
import { RegisterWorkspace } from "@/components/app/register-workspace"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import {
  getMdrOverview,
  MDR_REGISTER_PERMISSIONS,
} from "@/server/services/mdr/mdr-service"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
import { Button } from "@/components/dtg/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"
import { Input } from "@/components/dtg/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/dtg/table"

export const dynamic = "force-dynamic"
const approvalOrigin =
  process.env.APPROVE_PUBLIC_ORIGIN?.trim() || "http://127.0.0.1:3001"

function WorkflowActions({
  revisionId,
  workflowStatus,
  permissions,
}: {
  revisionId: string
  workflowStatus: string
  permissions: {
    canPrepare: boolean
    canReview: boolean
    canApprove: boolean
    canDcCheck: boolean
    canUpload: boolean
  }
}) {
  if (
    (workflowStatus === "Draft" || workflowStatus === "Uploaded") &&
    permissions.canPrepare
  ) {
    return (
      <form action={prepareRevisionAction} className="grid gap-2">
        <input type="hidden" name="revisionId" value={revisionId} />
        <Input name="comments" placeholder="Preparation note" />
        <SubmitButton
          label="Prepared and send to review"
          pendingLabel="Updating"
          className="w-full"
        />
      </form>
    )
  }

  if (workflowStatus === "PendingReview" && permissions.canReview) {
    return (
      <div className="grid gap-2">
        <form action={reviewApproveRevisionAction} className="grid gap-2">
          <input type="hidden" name="revisionId" value={revisionId} />
          <Input name="comments" placeholder="Review approval note" />
          <SubmitButton
            label="Review approve"
            pendingLabel="Updating"
            className="w-full"
          />
        </form>
        <form action={reviewRejectRevisionAction} className="grid gap-2">
          <input type="hidden" name="revisionId" value={revisionId} />
          <Input name="comments" placeholder="Review rejection comment" />
          <SubmitButton
            label="Review reject"
            pendingLabel="Updating"
            className="w-full"
          />
        </form>
      </div>
    )
  }

  if (workflowStatus === "PendingApproval" && permissions.canApprove) {
    return (
      <div className="grid gap-2">
        <form action={approveApproveRevisionAction} className="grid gap-2">
          <input type="hidden" name="revisionId" value={revisionId} />
          <Input name="comments" placeholder="Approval note" />
          <SubmitButton
            label="Approve"
            pendingLabel="Updating"
            className="w-full"
          />
        </form>
        <form action={approveRejectRevisionAction} className="grid gap-2">
          <input type="hidden" name="revisionId" value={revisionId} />
          <Input name="comments" placeholder="Approval rejection reason" />
          <SubmitButton
            label="Reject"
            pendingLabel="Updating"
            className="w-full"
          />
        </form>
      </div>
    )
  }

  if (workflowStatus === "ReadyForDcCheck" && permissions.canDcCheck) {
    return (
      <div className="grid gap-2">
        <form action={dcApproveRevisionAction} className="grid gap-2">
          <input type="hidden" name="revisionId" value={revisionId} />
          <Input name="comments" placeholder="DC validation note" />
          <SubmitButton
            label="Ready to submit"
            pendingLabel="Updating"
            className="w-full"
          />
        </form>
        <form action={dcRejectRevisionAction} className="grid gap-2">
          <input type="hidden" name="revisionId" value={revisionId} />
          <Input name="comments" placeholder="Return for correction" />
          <SubmitButton
            label="Return to preparer"
            pendingLabel="Updating"
            className="w-full"
          />
        </form>
      </div>
    )
  }

  return (
    <span className="text-soft text-sm">
      No workflow action available for your role.
    </span>
  )
}

export default async function MdrPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string | string[]
    revisionId?: string | string[]
  }>
}) {
  const user = await requireCurrentAppUser()
  requireUserHasAnyPermission(user, MDR_REGISTER_PERMISSIONS)

  const filters = (await searchParams) ?? {}
  const pageValue = Array.isArray(filters.page) ? filters.page[0] : filters.page
  const revisionId = Array.isArray(filters.revisionId)
    ? filters.revisionId[0]
    : filters.revisionId
  const page = Number(pageValue ?? "1")
  const overview = await getMdrOverview(user, page, revisionId)

  return (
    <RegisterWorkspace
      eyebrow="Controlled document register"
      title="MDR"
      description="Find the document, understand its current revision, and take the next available workflow action without leaving the register."
      metrics={[
        { label: "Documents", value: overview.counts.total },
        { label: "Draft", value: overview.counts.readyForWorkflow },
        { label: "Submitted", value: overview.counts.submittedToClient },
        { label: "Waiting reply", value: overview.counts.awaitingReply },
      ]}
    >
      {overview.focusedRevisionId ? (
        <div className="border-accent bg-accent-bg flex items-center justify-between rounded-[10px] border px-3 py-2 text-xs">
          <span>Showing the revision selected from your task queue.</span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/mdr">Clear focus</Link>
          </Button>
        </div>
      ) : null}
      <Card className="border-line bg-panel">
        <CardHeader>
          <CardTitle className="text-lg">MDR documents</CardTitle>
          <CardDescription>
            Current operational documents and their latest revision state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>DTGSA number</TableHead>
                  <TableHead>Client number</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Current revision</TableHead>
                  <TableHead>Reply state</TableHead>
                  <TableHead>Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.documents.map((document) => (
                  <TableRow
                    key={document.id}
                    id={
                      document.currentRevision
                        ? `revision-${document.currentRevision.id}`
                        : undefined
                    }
                    className="target:bg-accent-bg2 scroll-mt-4"
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {document.project.code} - {document.project.name}
                        </span>
                        <span className="text-soft text-xs">
                          {document.project.client.code} -{" "}
                          {document.project.client.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {document.dtgsaDocumentNumber}
                    </TableCell>
                    <TableCell>
                      {document.clientDocumentNumber ?? "Pending"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{document.title}</span>
                        <span className="text-soft text-xs">
                          {document.discipline.code} /{" "}
                          {document.documentTypeCategory?.code ?? "N/A"} /{" "}
                          {document.releasePurpose?.code ?? "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge>
                          Rev {document.currentRevision?.revisionLabel ?? "N/A"}
                        </Badge>
                        <span className="text-soft text-xs">
                          {document.currentRevision?.workflowStatus ?? "Draft"}{" "}
                          /{" "}
                          {document.currentRevision?.revisionStatus ??
                            "Original"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-64 flex-col gap-2">
                        <Badge variant="outline">
                          {document.currentClientReplyState}
                        </Badge>
                        <span className="text-soft text-xs">
                          {document._count.revisions} revisions /{" "}
                          {document._count.clientReplies} replies
                        </span>
                        {document.currentRevision ? (
                          <>
                            <WorkflowActions
                              revisionId={document.currentRevision.id}
                              workflowStatus={
                                document.currentRevision.workflowStatus
                              }
                              permissions={document.permissions}
                            />
                            <Button asChild variant="outline">
                              <Link
                                href={`${approvalOrigin}/?q=${encodeURIComponent(document.dtgsaDocumentNumber)}`}
                              >
                                Open central approval review
                              </Link>
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-72 flex-col gap-3">
                        {document.currentRevision ? (
                          <>
                            <div className="grid gap-2 md:grid-cols-2">
                              <form
                                action={generateRevisionCoverSheetsAction}
                                className="grid gap-2"
                              >
                                <input
                                  type="hidden"
                                  name="revisionId"
                                  value={document.currentRevision.id}
                                />
                                <SubmitButton
                                  label="Generate covers"
                                  pendingLabel="Generating"
                                  className="w-full"
                                />
                              </form>
                              <form
                                action={generateMergedRevisionPackageAction}
                                className="grid gap-2"
                              >
                                <input
                                  type="hidden"
                                  name="revisionId"
                                  value={document.currentRevision.id}
                                />
                                <SubmitButton
                                  label="Build merged PDF"
                                  pendingLabel="Building"
                                  className="w-full"
                                />
                              </form>
                            </div>
                            {document.signedInternalArtifact ? (
                              <Button asChild>
                                <a
                                  href={`/api/downloads/artifacts/${document.signedInternalArtifact.id}`}
                                >
                                  Download Signed Internally
                                </a>
                              </Button>
                            ) : (
                              <form
                                action={requestSignedInternalDownloadAction}
                                className="grid gap-2"
                              >
                                <input
                                  type="hidden"
                                  name="revisionId"
                                  value={document.currentRevision.id}
                                />
                                <SubmitButton
                                  label="Download Signed Internally"
                                  pendingLabel="Queuing secure assembly"
                                  className="w-full"
                                />
                              </form>
                            )}
                            <form
                              action={uploadRevisionFileAction}
                              className="grid gap-2"
                            >
                              <input
                                type="hidden"
                                name="revisionId"
                                value={document.currentRevision.id}
                              />
                              <Input name="file" type="file" />
                              <SubmitButton
                                label="Upload source file"
                                pendingLabel="Uploading"
                                className="w-full"
                                disabled={!document.permissions.canUpload}
                              />
                            </form>
                            {document.currentRevisionFiles.length > 0 ? (
                              <div className="grid gap-2">
                                {document.currentRevisionFiles.map((file) => (
                                  <div
                                    key={file.id}
                                    className="border-line bg-raise rounded-[10px] border p-3"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium">
                                          {file.fileName}
                                        </p>
                                        <p className="text-soft text-xs">
                                          {file.type} /{" "}
                                          {Math.max(
                                            1,
                                            Math.round(
                                              file.fileSizeBytes / 1024
                                            )
                                          )}{" "}
                                          KB
                                        </p>
                                      </div>
                                      {file.accessUrl ? (
                                        <Button
                                          asChild
                                          size="sm"
                                          variant="outline"
                                        >
                                          <a
                                            href={file.accessUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            Open
                                          </a>
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-soft text-xs">
                                No source files uploaded yet.
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-soft text-sm">
                            No current revision.
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
              No MDR documents exist yet. Promote a PDI item after client
              numbering is received to create the first MDR record.
            </div>
          )}
        </CardContent>
        <RegisterPagination basePath="/mdr" {...overview.pagination} />
      </Card>
    </RegisterWorkspace>
  )
}
