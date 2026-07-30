import {
  mergePdfToolAction,
  removePagesPdfToolAction,
  reorderPdfToolAction,
  rotatePdfToolAction,
  splitPdfToolAction,
  stampPdfToolAction,
} from "@/server/actions/pdf-tools"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { getPdfToolResult } from "@/server/services/pdf/pdf-tools-service"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"
import { Input } from "@/components/dtg/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dtg/tabs"

export const dynamic = "force-dynamic"

type PdfToolsPageProps = {
  searchParams?: Promise<{
    manifest?: string
  }>
}

export default async function PdfToolsPage({
  searchParams,
}: PdfToolsPageProps) {
  const user = await requireCurrentAppUser()
  requireUserHasAnyPermission(user, [
    PERMISSIONS.mdrManage,
    PERMISSIONS.dcCheck,
  ])
  const resolvedSearchParams = (await searchParams) ?? {}
  const result = await getPdfToolResult(resolvedSearchParams.manifest)

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <Card className="border-line bg-panel">
        <CardHeader className="border-line bg-head gap-2 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
              PDF Tools
            </Badge>
            <Badge variant="outline">
              Merge, split, reorder, rotate, remove, stamp
            </Badge>
          </div>
          <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
            The practical document-control PDF toolset is now exposed inside the
            app.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            Use these tools for package assembly and operational cleanup work.
            Results are stored in temporary platform storage and returned as
            downloadable links.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Toolbox</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="merge" className="grid gap-4">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-2">
                <TabsTrigger value="merge">Merge</TabsTrigger>
                <TabsTrigger value="split">Split</TabsTrigger>
                <TabsTrigger value="remove">Remove pages</TabsTrigger>
                <TabsTrigger value="reorder">Reorder</TabsTrigger>
                <TabsTrigger value="rotate">Rotate</TabsTrigger>
                <TabsTrigger value="stamp">Stamp text</TabsTrigger>
              </TabsList>

              <TabsContent value="merge">
                <form action={mergePdfToolAction} className="grid gap-3">
                  <Input
                    name="files"
                    type="file"
                    accept=".pdf"
                    multiple
                    required
                  />
                  <SubmitButton
                    label="Merge PDFs"
                    pendingLabel="Processing"
                    className="w-full"
                  />
                </form>
              </TabsContent>

              <TabsContent value="split">
                <form action={splitPdfToolAction} className="grid gap-3">
                  <Input name="file" type="file" accept=".pdf" required />
                  <SubmitButton
                    label="Split PDF"
                    pendingLabel="Processing"
                    className="w-full"
                  />
                </form>
              </TabsContent>

              <TabsContent value="remove">
                <form action={removePagesPdfToolAction} className="grid gap-3">
                  <Input name="file" type="file" accept=".pdf" required />
                  <Input
                    name="pages"
                    placeholder="Pages to remove, e.g. 2,4,5"
                    required
                  />
                  <SubmitButton
                    label="Remove pages"
                    pendingLabel="Processing"
                    className="w-full"
                  />
                </form>
              </TabsContent>

              <TabsContent value="reorder">
                <form action={reorderPdfToolAction} className="grid gap-3">
                  <Input name="file" type="file" accept=".pdf" required />
                  <Input
                    name="order"
                    placeholder="New order, e.g. 1,3,2,4"
                    required
                  />
                  <SubmitButton
                    label="Reorder PDF"
                    pendingLabel="Processing"
                    className="w-full"
                  />
                </form>
              </TabsContent>

              <TabsContent value="rotate">
                <form action={rotatePdfToolAction} className="grid gap-3">
                  <Input name="file" type="file" accept=".pdf" required />
                  <Input
                    name="pages"
                    placeholder="Pages to rotate, e.g. 1,2"
                    required
                  />
                  <select
                    name="degreesValue"
                    className="border-edge bg-bg h-10 rounded-[7px] border px-3 text-sm"
                    defaultValue="90"
                  >
                    <option value="90">90 degrees</option>
                    <option value="180">180 degrees</option>
                    <option value="270">270 degrees</option>
                  </select>
                  <SubmitButton
                    label="Rotate pages"
                    pendingLabel="Processing"
                    className="w-full"
                  />
                </form>
              </TabsContent>

              <TabsContent value="stamp">
                <form action={stampPdfToolAction} className="grid gap-3">
                  <Input name="file" type="file" accept=".pdf" required />
                  <Input name="text" placeholder="Stamp text" required />
                  <div className="grid gap-3 md:grid-cols-4">
                    <Input name="page" placeholder="Page" />
                    <Input name="x" placeholder="X" />
                    <Input name="y" placeholder="Y" />
                    <Input name="size" placeholder="Size" />
                  </div>
                  <SubmitButton
                    label="Stamp PDF"
                    pendingLabel="Processing"
                    className="w-full"
                  />
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
          <CardHeader>
            <CardTitle className="text-lg">Latest result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result ? (
              <>
                <div className="border-line bg-raise rounded-[9px] border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium capitalize">{result.operation}</p>
                    <Badge variant="outline">
                      {result.entries.length} file(s)
                    </Badge>
                  </div>
                  <p className="text-soft mt-1 text-sm">
                    Generated{" "}
                    {new Date(result.createdAt).toLocaleString("en-US")}
                  </p>
                </div>
                {result.entries.map((entry) => (
                  <div
                    key={entry.providerKey}
                    className="border-line bg-raise rounded-[9px] border p-4"
                  >
                    <p className="font-medium">{entry.label}</p>
                    <p className="text-soft text-sm">{entry.fileName}</p>
                    {entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent-txt mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
                      >
                        Download result
                      </a>
                    ) : null}
                  </div>
                ))}
              </>
            ) : (
              <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
                Run a PDF tool to generate a downloadable output manifest here.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
