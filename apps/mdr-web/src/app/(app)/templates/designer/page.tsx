import Link from "next/link"
import {
  DEFAULT_COVER_TEMPLATE,
  type CoverTemplateDocument,
} from "@dtg/cover-designer"
import { Badge } from "@/components/ui/badge"
import { CoverDesignerWorkspace } from "@/components/cover-designer/cover-designer-workspace"
import { createVisualCoverDraftAction } from "@/server/actions/templates"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import { getVisualCoverDesignerOverview } from "@/server/services/templates/visual-cover-template-service"

export const dynamic = "force-dynamic"

export default async function CoverDesignerPage({
  searchParams,
}: {
  searchParams: Promise<{ version?: string }>
}) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.templatesManage)
  const [overview, query] = await Promise.all([
    getVisualCoverDesignerOverview(),
    searchParams,
  ])
  const selected =
    overview.versions.find((version) => version.id === query.version) ??
    overview.versions.find((version) => version.status === "Draft") ??
    null
  const initialTemplate =
    selected?.snapshot && typeof selected.snapshot === "object"
      ? (selected.snapshot as unknown as CoverTemplateDocument)
      : DEFAULT_COVER_TEMPLATE
  const scopeOptions = {
    CLIENT: overview.options.clients,
    PROJECT: overview.options.projects,
    DOCUMENT_TYPE: overview.options.documentTypes,
    DISCIPLINE: overview.options.disciplines,
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <header className="relative overflow-hidden rounded-[28px] border border-teal-900/40 bg-[linear-gradient(120deg,#102629,#18383a_56%,#3b3020)] p-6 text-white shadow-xl">
        <div className="absolute -top-20 right-10 size-56 rounded-full border border-teal-200/10" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-teal-300 text-teal-950 hover:bg-teal-300">
              Document Control
            </Badge>
            <Badge className="border-amber-300/40 bg-transparent text-amber-200">
              Resolution-independent cover studio
            </Badge>
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight">
            Design controlled cover pages as structured layouts, not
            screenshots.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-teal-50/75">
            Build client and project variants, bind workflow evidence, preview
            real page dimensions, and publish immutable versions.
          </p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="border-border/70 bg-card space-y-4 rounded-3xl border p-5">
          <div>
            <h2 className="font-semibold">Create or clone a draft</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Inheritance order: organization, client, project, document type,
              discipline.
            </p>
          </div>
          <form action={createVisualCoverDraftAction} className="grid gap-3">
            <input
              name="code"
              required
              placeholder="CLIENT_PROJECT_COVER"
              className="bg-background h-10 rounded-xl border px-3 text-sm"
            />
            <input
              name="name"
              required
              placeholder="Client project cover"
              className="bg-background h-10 rounded-xl border px-3 text-sm"
            />
            <select
              name="scopeType"
              className="bg-background h-10 rounded-xl border px-3 text-sm"
            >
              <option value="ORGANIZATION">Organization default</option>
              <option value="CLIENT">Client override</option>
              <option value="PROJECT">Project override</option>
              <option value="DOCUMENT_TYPE">Document type override</option>
              <option value="DISCIPLINE">Discipline override</option>
            </select>
            <select
              name="scopeId"
              className="bg-background h-10 rounded-xl border px-3 text-sm"
            >
              <option value="">Organization / choose matching scope</option>
              {Object.entries(scopeOptions).flatMap(([scope, options]) =>
                options.map((option) => (
                  <option key={`${scope}:${option.id}`} value={option.id}>
                    {scope.replace("_", " ")} - {option.code} - {option.name}
                  </option>
                ))
              )}
            </select>
            <select
              name="cloneVersionId"
              className="bg-background h-10 rounded-xl border px-3 text-sm"
            >
              <option value="">Start from DTG default</option>
              {overview.versions.map((version) => (
                <option key={version.id} value={version.id}>
                  Clone {version.code} v{version.version} - {version.status}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Create draft
            </button>
          </form>
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold">Versions</h3>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto">
              {overview.versions.map((version) => (
                <Link
                  key={version.id}
                  href={`/templates/designer?version=${version.id}`}
                  className={`block rounded-xl border p-3 text-sm ${
                    selected?.id === version.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <span className="font-medium">{version.name}</span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {version.code} - v{version.version} - {version.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-border/70 bg-muted/20 text-muted-foreground rounded-3xl border border-dashed p-6 text-sm leading-6">
          <h2 className="text-foreground font-semibold">Designer help</h2>
          <p className="mt-2">
            Hold Shift to select multiple elements. Drag to move with snapping.
            Use the inspector for exact relative coordinates, the toolbar for
            layer and history operations, and Preview sample before publishing.
          </p>
          <p className="mt-2">
            Prepared By Manager is mandatory. Signature images are appearance
            only; generated covers include evidence references.
          </p>
        </div>
      </section>

      {selected?.status === "Draft" ? (
        <CoverDesignerWorkspace
          key={selected.id}
          versionId={selected.id}
          initialTemplate={initialTemplate}
        />
      ) : (
        <div className="text-muted-foreground rounded-3xl border border-dashed p-10 text-center">
          {selected
            ? "Published and superseded versions are immutable. Clone this version to edit."
            : "Create a draft to open the visual designer."}
        </div>
      )}
    </div>
  )
}
