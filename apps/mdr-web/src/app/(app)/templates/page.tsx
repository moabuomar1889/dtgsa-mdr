import Link from "next/link"
import { CoverSheetKind } from "@prisma/client"
import {
  createCoverTemplateAction,
  createTransmittalTemplateAction,
} from "@/server/actions/templates"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import { getTemplateManagementOverview } from "@/server/services/templates/template-management-service"
import { PERMISSIONS } from "@/lib/permissions/rbac"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export const dynamic = "force-dynamic"

function ScopeFields({
  clients,
  projects,
}: {
  clients: Array<{ id: string; code: string; name: string }>
  projects: Array<{ id: string; code: string; name: string; clientId: string }>
}) {
  return (
    <>
      <div className="grid gap-2">
        <label htmlFor="scope" className="text-sm font-medium">
          Scope
        </label>
        <select
          id="scope"
          name="scope"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="global"
        >
          <option value="global">Global</option>
          <option value="client">Client</option>
          <option value="project">Project</option>
        </select>
      </div>
      <div className="grid gap-2">
        <label htmlFor="clientId" className="text-sm font-medium">
          Client
        </label>
        <select
          id="clientId"
          name="clientId"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          defaultValue=""
        >
          <option value="">Use only when scope is client or project</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.code} - {client.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <label htmlFor="projectId" className="text-sm font-medium">
          Project
        </label>
        <select
          id="projectId"
          name="projectId"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          defaultValue=""
        >
          <option value="">Use only when scope is project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} - {project.name}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

export default async function TemplatesPage() {
  const user = await requireCurrentAppUser()
  assertUserHasAnyPermission(user, PERMISSIONS.templatesManage)
  const overview = await getTemplateManagementOverview()

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
              Templates
            </Badge>
            <Badge variant="outline">DOCX-driven cover and transmittal assets</Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Template management is now live for project, client, and global DOCX assets.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            Upload versioned template files, mark defaults per scope, and keep the cover and transmittal engine anchored to managed assets instead of ad-hoc files.
          </CardDescription>
          <div>
            <Link
              href="/templates/designer"
              className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Open visual cover designer
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Cover templates</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.coverTemplates.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Transmittal templates</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.transmittalTemplates.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Clients</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.clients.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Projects</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{overview.projects.length}</p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Upload template</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="cover" className="grid gap-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cover">Cover Sheet</TabsTrigger>
                <TabsTrigger value="transmittal">Transmittal</TabsTrigger>
              </TabsList>

              <TabsContent value="cover">
                <form action={createCoverTemplateAction} className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <ScopeFields clients={overview.clients} projects={overview.projects} />
                    <div className="grid gap-2">
                      <label htmlFor="kind" className="text-sm font-medium">
                        Cover kind
                      </label>
                      <select
                        id="kind"
                        name="kind"
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue={CoverSheetKind.DTGSA_COVER}
                      >
                        <option value={CoverSheetKind.DTGSA_COVER}>DTGSA cover</option>
                        <option value={CoverSheetKind.CLIENT_COVER}>Client cover</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <label htmlFor="cover-name" className="text-sm font-medium">
                        Template name
                      </label>
                      <Input id="cover-name" name="name" placeholder="Air Products Cover v1" required />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="cover-file" className="text-sm font-medium">
                        DOCX file
                      </label>
                      <Input id="cover-file" name="file" type="file" accept=".docx" required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="cover-description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea id="cover-description" name="description" rows={4} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input name="isDefault" type="checkbox" className="size-4" />
                    Set as the default template for this scope
                  </label>
                  <SubmitButton label="Upload cover template" pendingLabel="Uploading" className="w-full" />
                </form>
              </TabsContent>

              <TabsContent value="transmittal">
                <form action={createTransmittalTemplateAction} className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <ScopeFields clients={overview.clients} projects={overview.projects} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <label htmlFor="transmittal-name" className="text-sm font-medium">
                        Template name
                      </label>
                      <Input id="transmittal-name" name="name" placeholder="Client transmittal page" required />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="transmittal-file" className="text-sm font-medium">
                        DOCX file
                      </label>
                      <Input id="transmittal-file" name="file" type="file" accept=".docx" required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="transmittal-description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea id="transmittal-description" name="description" rows={4} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input name="isDefault" type="checkbox" className="size-4" />
                    Set as the default transmittal template for this scope
                  </label>
                  <SubmitButton label="Upload transmittal template" pendingLabel="Uploading" className="w-full" />
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Current templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-medium">Cover sheets</h3>
              {overview.coverTemplates.length > 0 ? (
                overview.coverTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-2xl border border-border/60 bg-background/80 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{template.kind}</Badge>
                      <Badge variant="outline">v{template.version}</Badge>
                      {template.isDefault ? <Badge>Default</Badge> : null}
                    </div>
                    <p className="mt-3 font-medium">{template.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {template.project
                        ? `${template.project.code} - ${template.project.name}`
                        : template.client
                          ? `${template.client.code} - ${template.client.name}`
                          : "Global system template"}
                    </p>
                    {template.fileUrl ? (
                      <a
                        href={template.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Open DOCX
                      </a>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                  No cover templates have been uploaded yet.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">Transmittals</h3>
              {overview.transmittalTemplates.length > 0 ? (
                overview.transmittalTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-2xl border border-border/60 bg-background/80 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">v{template.version}</Badge>
                      {template.isDefault ? <Badge>Default</Badge> : null}
                    </div>
                    <p className="mt-3 font-medium">{template.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {template.project
                        ? `${template.project.code} - ${template.project.name}`
                        : template.client
                          ? `${template.client.code} - ${template.client.name}`
                          : "Global system template"}
                    </p>
                    {template.fileUrl ? (
                      <a
                        href={template.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Open DOCX
                      </a>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                  No transmittal templates have been uploaded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
