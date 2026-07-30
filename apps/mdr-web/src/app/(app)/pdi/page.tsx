import Link from "next/link"
import { PdiStatus } from "@prisma/client"
import {
  createPdiItemAction,
  markPdiItemSentToClientAction,
  promotePdiItemToMdrAction,
  updatePdiClientDocumentNumberAction,
} from "@/server/actions/pdi"
import { importPdiWorkbookAction } from "@/server/actions/pdi-import"
import { getPdiOverview } from "@/server/services/pdi/pdi-service"
import { PdiItemForm } from "@/components/app/pdi-item-form"
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

function pdiStatusVariant(status: PdiStatus) {
  switch (status) {
    case PdiStatus.ConvertedToMdr:
    case PdiStatus.ClientNumberReceived:
      return "default" as const
    default:
      return "outline" as const
  }
}

export default async function PdiPage() {
  const overview = await getPdiOverview()

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-line bg-panel">
          <CardHeader className="border-line bg-head gap-2 border-b">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
                PDI Register
              </Badge>
              <Badge variant="outline">Phase 2 started</Badge>
            </div>
            <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
              The Project Document Index is now a working register with
              auto-number generation and promotion into the MDR.
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              New lines are created through the numbering engine, client numbers
              can be captured inline, and eligible records can be promoted into
              operational MDR documents without leaving this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Total lines</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {overview.counts.total}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Waiting on client</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {overview.counts.pendingClientNumber}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Client numbers in</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {overview.counts.clientNumberReceived}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Promoted to MDR</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {overview.counts.converted}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Create PDI item</CardTitle>
            <CardDescription>
              Create the register line first. The DTGSA document number is
              generated automatically from the numbering rule.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.projects.length > 0 ? (
              <div className="grid gap-6">
                <PdiItemForm
                  projects={overview.projects.map((project) => ({
                    id: project.id,
                    code: project.code,
                    name: project.name,
                    clientCode: project.client.code,
                    clientName: project.client.name,
                  }))}
                  disciplines={overview.disciplines}
                  documentTypes={overview.documentTypes}
                  releasePurposes={overview.releasePurposes}
                  action={createPdiItemAction}
                />

                <div className="border-line bg-raise grid gap-4 rounded-[9px] border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Excel import / export</p>
                    <p className="text-soft text-sm">
                      Export project PDI workbooks for client collaboration, or
                      bulk import Excel rows back into the register.
                    </p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                    <div className="grid gap-3">
                      {overview.projects.map((project) => (
                        <Button key={project.id} asChild variant="outline">
                          <a href={`/api/pdi/export?projectId=${project.id}`}>
                            Export {project.code} workbook
                          </a>
                        </Button>
                      ))}
                    </div>

                    <form
                      action={importPdiWorkbookAction}
                      className="border-line bg-panel grid gap-3 rounded-[10px] border p-4"
                    >
                      <div className="grid gap-2">
                        <label
                          htmlFor="pdi-import-project"
                          className="text-sm font-medium"
                        >
                          Import target project
                        </label>
                        <select
                          id="pdi-import-project"
                          name="projectId"
                          className="border-edge bg-bg h-10 rounded-[7px] border px-3 text-sm"
                          defaultValue={overview.projects[0]?.id}
                        >
                          {overview.projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.code} - {project.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <label
                          htmlFor="pdi-import-file"
                          className="text-sm font-medium"
                        >
                          Excel workbook
                        </label>
                        <Input
                          id="pdi-import-file"
                          name="file"
                          type="file"
                          accept=".xlsx,.xls"
                          required
                        />
                      </div>
                      <SubmitButton
                        label="Import workbook"
                        pendingLabel="Importing"
                        className="w-full"
                      />
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                  No projects exist yet, so the PDI register cannot be created
                  until the first project is onboarded.
                </div>
                <Button asChild>
                  <Link href="/projects/new">Create first project</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-line bg-panel">
        <CardHeader>
          <CardTitle className="text-lg">PDI line items</CardTitle>
          <CardDescription>
            Register items across all initiated projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>DTGSA number</TableHead>
                  <TableHead>Client number</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>MDR</TableHead>
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
                        <span className="text-soft text-xs">
                          {item.project.client.code} -{" "}
                          {item.project.client.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.dtgsaDocumentNumber}
                    </TableCell>
                    <TableCell>
                      {item.clientDocumentNumber ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">
                            {item.clientDocumentNumber}
                          </span>
                          {item.status !== PdiStatus.ConvertedToMdr ? (
                            <form
                              action={updatePdiClientDocumentNumberAction}
                              className="flex flex-col gap-2"
                            >
                              <input
                                type="hidden"
                                name="pdiItemId"
                                value={item.id}
                              />
                              <Input
                                name="clientDocumentNumber"
                                defaultValue={item.clientDocumentNumber}
                              />
                              <SubmitButton
                                label="Update"
                                pendingLabel="Saving"
                                className="w-full"
                              />
                            </form>
                          ) : null}
                        </div>
                      ) : (
                        <form
                          action={updatePdiClientDocumentNumberAction}
                          className="flex min-w-56 flex-col gap-2"
                        >
                          <input
                            type="hidden"
                            name="pdiItemId"
                            value={item.id}
                          />
                          <Input
                            name="clientDocumentNumber"
                            placeholder="Enter client number"
                          />
                          <SubmitButton
                            label="Save number"
                            pendingLabel="Saving"
                            className="w-full"
                          />
                        </form>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-soft text-xs">
                          {item.discipline.code} /{" "}
                          {item.documentTypeCategory?.code} /{" "}
                          {item.releasePurpose?.code} / Rev {item.revision}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-44 flex-col gap-2">
                        <Badge variant={pdiStatusVariant(item.status)}>
                          {item.status}
                        </Badge>
                        {item.status === PdiStatus.Draft ? (
                          <form action={markPdiItemSentToClientAction}>
                            <input
                              type="hidden"
                              name="pdiItemId"
                              value={item.id}
                            />
                            <SubmitButton
                              label="Send to client"
                              pendingLabel="Updating"
                              className="w-full"
                            />
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.mdrDocument ? (
                        <div className="flex flex-col gap-1">
                          <Badge>MDR linked</Badge>
                          <span className="text-soft text-xs">
                            {item.mdrDocument.currentWorkflowStatus}
                          </span>
                        </div>
                      ) : item.status === PdiStatus.ClientNumberReceived ? (
                        <form action={promotePdiItemToMdrAction}>
                          <input
                            type="hidden"
                            name="pdiItemId"
                            value={item.id}
                          />
                          <SubmitButton
                            label="Promote to MDR"
                            pendingLabel="Promoting"
                            className="w-full"
                          />
                        </form>
                      ) : (
                        <span className="text-soft text-sm">
                          Waiting for client numbering
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
              No PDI items exist yet. Create the first line from the form above
              to start the numbering and client-collaboration workflow.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
