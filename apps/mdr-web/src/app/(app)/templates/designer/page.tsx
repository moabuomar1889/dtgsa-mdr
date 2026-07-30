import Link from "next/link"
import {
  DEFAULT_COVER_TEMPLATE,
  type CoverTemplateDocument,
} from "@dtg/cover-designer"
import { Badge } from "@/components/dtg/badge"
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
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <header className="border-line bg-head overflow-hidden rounded-[9px] border p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Document Control</Badge>
            <Badge variant="outline">Resolution-independent cover studio</Badge>
          </div>
          <h1 className="mt-4 max-w-4xl text-[22px] font-medium tracking-[-0.02em]">
            Design controlled cover pages as structured layouts, not
            screenshots.
          </h1>
          <p className="text-soft mt-3 max-w-3xl text-[12px] leading-5">
            Build client and project variants, bind workflow evidence, preview
            real page dimensions, and publish immutable versions.
          </p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="border-line bg-panel space-y-4 rounded-[9px] border p-5">
          <div>
            <h2 className="font-semibold">Create or clone a draft</h2>
            <p className="text-soft mt-1 text-sm">
              Inheritance order: organization, client, project, document type,
              discipline.
            </p>
          </div>
          <form action={createVisualCoverDraftAction} className="grid gap-3">
            <input
              name="code"
              required
              placeholder="CLIENT_PROJECT_COVER"
              className="border-edge bg-raise h-9 rounded-[8px] border px-3 text-[12px]"
            />
            <input
              name="name"
              required
              placeholder="Client project cover"
              className="border-edge bg-raise h-9 rounded-[8px] border px-3 text-[12px]"
            />
            <select
              name="scopeType"
              className="border-edge bg-raise h-9 rounded-[8px] border px-3 text-[12px]"
            >
              <option value="ORGANIZATION">Organization default</option>
              <option value="CLIENT">Client override</option>
              <option value="PROJECT">Project override</option>
              <option value="DOCUMENT_TYPE">Document type override</option>
              <option value="DISCIPLINE">Discipline override</option>
            </select>
            <select
              name="scopeId"
              className="border-edge bg-raise h-9 rounded-[8px] border px-3 text-[12px]"
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
              className="border-edge bg-raise h-9 rounded-[8px] border px-3 text-[12px]"
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
              className="border-accent bg-accent text-on-accent rounded-[8px] border px-4 py-2 text-[12px] font-medium"
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
                  className={`block rounded-[10px] border p-3 text-sm ${
                    selected?.id === version.id
                      ? "border-accent bg-accent-bg"
                      : "border-line hover:bg-raise"
                  }`}
                >
                  <span className="font-medium">{version.name}</span>
                  <span className="text-soft mt-1 block text-xs">
                    {version.code} - v{version.version} - {version.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
          <h2 className="text-text font-semibold">Designer help</h2>
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
        <div className="text-soft rounded-[9px] border border-dashed p-10 text-center">
          {selected
            ? "Published and superseded versions are immutable. Clone this version to edit."
            : "Create a draft to open the visual designer."}
        </div>
      )}
    </div>
  )
}
