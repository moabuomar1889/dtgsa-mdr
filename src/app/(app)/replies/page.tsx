import { ClientReplyState } from "@prisma/client"
import { recordClientReplyAction } from "@/server/actions/replies"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getClientRepliesOverview } from "@/server/services/replies/client-reply-service"
import { ClientReplyForm } from "@/components/app/client-reply-form"
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

export default async function RepliesPage() {
  const user = await requireCurrentAppUser()
  const overview = await getClientRepliesOverview(user)

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
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
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Waiting reply</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {overview.counts.pendingReply}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Replies recorded</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {overview.counts.totalReplies}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Revision required</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {overview.counts.revisionRequired}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">No further submittal</p>
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
            {overview.documents.length > 0 ? (
              <ClientReplyForm
                documents={overview.documents}
                action={recordClientReplyAction}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                No documents are currently waiting for a client reply. Send a
                transmittal first to start the reply loop.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

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
                        <span className="text-xs text-muted-foreground">
                          {reply.transmittal?.transmittalNumber ?? "Direct reply"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {reply.document.dtgsaDocumentNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {reply.document.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Rev {reply.submittedRevision?.revisionLabel ?? "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline">Code {reply.reviewCode.code}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {reply.reviewCode.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-48 flex-col gap-2">
                        <Badge variant={replyStateVariant(reply.replyState)}>
                          {reply.replyState}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {reply.nextAction}
                        </span>
                        {reply.triggeredRevisions.length > 0 ? (
                          <span className="text-xs text-muted-foreground">
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
                    <TableCell className="text-sm text-muted-foreground">
                      {reply.driveFileName ?? "Not stored yet"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {reply.replyDate.toLocaleString("en-US")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              No client replies have been recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
