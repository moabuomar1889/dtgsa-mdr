import { ClientReplyState } from "@prisma/client"
import Link from "next/link"
import {
  createRevisionFromClientResponseAction,
  registerConfiguredClientResponseAction,
  requestClientResponseDownloadAction,
} from "@/server/actions/replies"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getClientRepliesOverview } from "@/server/services/replies/client-reply-overview-service"
import { getConfigurableClientResponseOverview } from "@/server/services/replies/client-response-service"
import { ClientResponseForm } from "@/components/app/client-response-form"
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
import { Button } from "@/components/dtg/button"
import { Input } from "@/components/dtg/input"

export const dynamic = "force-dynamic"

function replyStateVariant(state: ClientReplyState) {
  switch (state) {
    case ClientReplyState.NoFurtherSubmittal:
      return "default" as const
    case ClientReplyState.RevisionRequired:
      return "destructive" as const
    default:
      return "outline" as const
  }
}

export default async function RepliesPage({
  searchParams,
}: {
  searchParams: Promise<{
    outcome?: string
    action?: "REVISION_REQUIRED" | "OVERDUE" | "ALL"
  }>
}) {
  const user = await requireCurrentAppUser()
  const filters = await searchParams
  const overview = await getClientRepliesOverview(user)
  const configured = await getConfigurableClientResponseOverview(user, {
    outcomeClass: filters.outcome || undefined,
    action: filters.action || "ALL",
  })

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="border-border/60 from-primary/12 gap-3 border-b bg-gradient-to-br via-transparent to-transparent">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-primary/15 text-primary hover:bg-primary/15 rounded-full px-3 py-1">
                Client Replies
              </Badge>
              <Badge variant="outline">Inbound review processing</Badge>
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Submitted documents can now receive client review codes and branch
              directly into revision or new-number follow-up.
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              This slice records reply metadata, applies client-specific review
              codes, enforces rejected-file naming metadata, and opens the next
              revision path from the same page.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
            <div className="border-border/60 bg-background/80 rounded-2xl border p-4">
              <p className="text-muted-foreground text-sm">Waiting reply</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {overview.counts.pendingReply}
              </p>
            </div>
            <div className="border-border/60 bg-background/80 rounded-2xl border p-4">
              <p className="text-muted-foreground text-sm">Replies recorded</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {overview.counts.totalReplies}
              </p>
            </div>
            <div className="border-border/60 bg-background/80 rounded-2xl border p-4">
              <p className="text-muted-foreground text-sm">Revision required</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {overview.counts.revisionRequired}
              </p>
            </div>
            <div className="border-border/60 bg-background/80 rounded-2xl border p-4">
              <p className="text-muted-foreground text-sm">
                No further submittal
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {overview.counts.noFurtherSubmittal}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Record client reply</CardTitle>
            <CardDescription>
              Select a submitted document, apply the client review code, and
              trigger the required follow-up path.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {configured.submissions.length > 0 ? (
              <ClientResponseForm
                submissions={configured.submissions}
                action={registerConfiguredClientResponseAction}
              />
            ) : (
              <div className="border-border/70 bg-background/80 text-muted-foreground rounded-2xl border border-dashed p-6 text-sm leading-6">
                No durable client submissions are waiting for a response.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/settings/response-codes">
            Manage response-code policies
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured response evidence</CardTitle>
          <CardDescription>
            Historical policy snapshots, dynamic labels, files, and revision
            actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <form className="grid gap-3 rounded-2xl border p-4 md:grid-cols-3">
            <select
              name="outcome"
              defaultValue={filters.outcome ?? ""}
              className="rounded-md border p-2"
            >
              <option value="">All outcomes</option>
              {[
                "REJECTED",
                "REJECTED_WITH_COMMENTS",
                "CONDITIONALLY_APPROVED",
                "APPROVED_WITH_COMMENTS",
                "REVISION_REQUIRED",
                "FINAL_APPROVED",
                "INFORMATION_ONLY",
                "HOLD",
                "CANCELLED",
                "CUSTOM",
              ].map((outcome) => (
                <option key={outcome}>{outcome}</option>
              ))}
            </select>
            <select
              name="action"
              defaultValue={filters.action ?? "ALL"}
              className="rounded-md border p-2"
            >
              <option value="ALL">All actions</option>
              <option value="REVISION_REQUIRED">Revision required</option>
              <option value="OVERDUE">Overdue action</option>
            </select>
            <Button type="submit" variant="outline">
              Filter response history
            </Button>
          </form>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-3">
              <p className="text-muted-foreground text-xs">
                Filtered responses
              </p>
              <p className="text-xl font-semibold">{configured.counts.total}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-muted-foreground text-xs">Revision required</p>
              <p className="text-xl font-semibold">
                {configured.counts.revisionRequired}
              </p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-muted-foreground text-xs">Overdue action</p>
              <p className="text-xl font-semibold">
                {configured.counts.overdue}
              </p>
            </div>
          </div>
          {configured.responses.map((response) => {
            const effects =
              (response.effectsSnapshot as Record<string, unknown> | null) ?? {}
            const requiresRevision =
              effects.newRevisionRequired === true ||
              effects.newDocumentNumberRequired === true
            return (
              <div key={response.id} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {response.externalCodeSnapshot} - {response.labelSnapshot}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {response.outcomeClass} / {response.incomingReference}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Response {response.receivedAt.toLocaleDateString()} /
                      Policy snapshot{" "}
                      {response.policySnapshot?.snapshotHash.slice(0, 12) ??
                        "Unavailable"}
                    </p>
                    {response.comments ? (
                      <p className="mt-2 text-sm">{response.comments}</p>
                    ) : null}
                    {response.files.length > 0 ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        Files:{" "}
                        {response.files
                          .map(
                            (file) =>
                              `${file.isPrimary ? "Primary" : "Attachment"}: ${
                                file.originalFileName ?? file.fileKind
                              }`
                          )
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {response.overdue ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : null}
                    <Badge variant={response.isActive ? "default" : "outline"}>
                      {response.isActive ? "Current" : "Historical"}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <form action={requestClientResponseDownloadAction}>
                    <input
                      type="hidden"
                      name="responseId"
                      value={response.id}
                    />
                    <SubmitButton
                      label={`Client Response - ${response.labelSnapshot}`}
                      pendingLabel="Queuing assembly"
                      variant="outline"
                    />
                  </form>
                  {requiresRevision &&
                  response.isActive &&
                  !response.triggeredRevisionId ? (
                    <form
                      action={createRevisionFromClientResponseAction}
                      className="grid gap-2 rounded-xl border p-3"
                    >
                      <input
                        type="hidden"
                        name="responseId"
                        value={response.id}
                      />
                      <Input
                        name="workingMainPdf"
                        type="file"
                        accept="application/pdf,.pdf"
                        required
                      />
                      <Input name="reason" placeholder="Revision reason" />
                      <SubmitButton
                        label="Create guided revision"
                        pendingLabel="Creating revision"
                      />
                    </form>
                  ) : null}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Reply history</CardTitle>
          <CardDescription>
            Recorded client responses and the follow-up paths they triggered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.replies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Review code</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Drive file</TableHead>
                  <TableHead>Reply date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.replies.map((reply) => (
                  <TableRow key={reply.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {reply.project.code} - {reply.project.name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {reply.transmittal?.transmittalNumber ??
                            "Direct reply"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {reply.document.dtgsaDocumentNumber}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {reply.document.title}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          Rev {reply.submittedRevision?.revisionLabel ?? "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline">
                          Code {reply.reviewCode.code}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {reply.reviewCode.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-48 flex-col gap-2">
                        <Badge variant={replyStateVariant(reply.replyState)}>
                          {reply.replyState}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {reply.nextAction}
                        </span>
                        {reply.triggeredRevisions.length > 0 ? (
                          <span className="text-muted-foreground text-xs">
                            Triggered:{" "}
                            {reply.triggeredRevisions
                              .map(
                                (revision) =>
                                  `${revision.document.dtgsaDocumentNumber} / Rev ${revision.revisionLabel}`
                              )
                              .join(", ")}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {reply.driveFileName ?? "Not stored yet"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {reply.replyDate.toLocaleString("en-US")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="border-border/70 bg-background/80 text-muted-foreground rounded-2xl border border-dashed p-6 text-sm leading-6">
              No client replies have been recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
