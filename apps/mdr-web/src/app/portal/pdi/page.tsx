import { updatePortalPdiClientDocumentNumberAction } from "@/server/actions/portal"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getPortalPdiOverview } from "@/server/services/pdi/pdi-excel-service"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

export default async function ClientPortalPdiPage() {
  const user = await requireCurrentAppUser()
  const overview = await getPortalPdiOverview(user)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
              Portal PDI
            </Badge>
            <Badge variant="outline">{overview.items.length} line items</Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Client document numbers can now be completed directly in the secure portal.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            This portal is focused on client numbering collaboration. Export the
            project workbook, complete client document numbers, and save updates back into the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 pt-4">
          {overview.projects.map((project) => (
            <a
              key={project.id}
              href={`/api/pdi/export?projectId=${project.id}`}
              className="rounded-lg border border-border/60 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Export {project.code} workbook
            </a>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Client numbering queue</CardTitle>
          <CardDescription>
            Update pending client document numbers for the projects assigned to your client portal access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>DTGSA number</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Client number</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {item.project.code} - {item.project.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.project.client.code} - {item.project.client.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.dtgsaDocumentNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.discipline.code} / {item.documentTypeCategory?.code ?? "N/A"} /{" "}
                          {item.releasePurpose?.code ?? "N/A"} / Rev {item.revision}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <form
                        action={updatePortalPdiClientDocumentNumberAction}
                        className="flex min-w-56 flex-col gap-2"
                      >
                        <input type="hidden" name="pdiItemId" value={item.id} />
                        <Input
                          name="clientDocumentNumber"
                          defaultValue={item.clientDocumentNumber ?? ""}
                          placeholder="Enter client number"
                        />
                        <SubmitButton
                          label="Save number"
                          pendingLabel="Saving"
                          className="w-full"
                        />
                      </form>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              No PDI items are currently available for client numbering in this portal account.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
