import { getMdrOverview } from "@/server/services/mdr/mdr-service"
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

export default async function MdrPage() {
  const overview = await getMdrOverview()

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
              MDR Register
            </Badge>
            <Badge variant="outline">Operational register</Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            MDR records are now visible as the operational destination for
            promoted PDI items.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            This screen currently focuses on the active document register and
            revision state. Workflow actions, uploads, signatures, and cover
            generation will build on top of these MDR records next.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Documents</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {overview.counts.total}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Draft workflow</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {overview.counts.readyForWorkflow}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {overview.counts.submittedToClient}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Waiting reply</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {overview.counts.awaitingReply}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {document.project.code} - {document.project.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {document.project.client.code} - {document.project.client.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {document.dtgsaDocumentNumber}
                    </TableCell>
                    <TableCell>{document.clientDocumentNumber ?? "Pending"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{document.title}</span>
                        <span className="text-xs text-muted-foreground">
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
                        <span className="text-xs text-muted-foreground">
                          {document.currentRevision?.workflowStatus ?? "Draft"} /{" "}
                          {document.currentRevision?.revisionStatus ?? "Original"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline">
                          {document.currentClientReplyState}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {document._count.revisions} revisions /{" "}
                          {document._count.clientReplies} replies
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              No MDR documents exist yet. Promote a PDI item after client
              numbering is received to create the first MDR record.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
