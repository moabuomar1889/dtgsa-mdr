import Link from "next/link"
import {
  COVER_TEMPLATE_PRESETS,
  DEFAULT_COVER_TEMPLATE,
  type CoverTemplateDocument,
} from "@dtg/cover-designer"
import { Badge } from "@/components/dtg/badge"
import { CoverDesignerWorkspace } from "@/components/cover-designer/cover-designer-workspace"
import { createVisualCoverDraftAction } from "@/server/actions/templates"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { getClientVisualCoverDesignerOverview } from "@/server/services/templates/visual-cover-template-service"

export const dynamic = "force-dynamic"

export default async function CoverDesignerPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; version?: string }>
}) {
  const actor = await requireCurrentAppUser()
  requireUserHasAnyPermission(actor, PERMISSIONS.templatesManage)
  const query = await searchParams
  const overview = await getClientVisualCoverDesignerOverview(query.client)
  const selectedClientId =
    overview.options.clients.find((client) => client.id === query.client)?.id ??
    overview.options.clients[0]?.id ??
    ""
  const selectedClient = overview.options.clients.find(
    (client) => client.id === selectedClientId
  )
  const clientLogoUrl = selectedClient?.logoBase64
    ? `data:${selectedClient.logoMimeType ?? "image/png"};base64,${selectedClient.logoBase64}`
    : undefined
  const selected =
    overview.versions.find((version) => version.id === query.version) ??
    overview.versions.find((version) => version.status === "Draft") ??
    null
  const initialTemplate =
    selected?.snapshot && typeof selected.snapshot === "object"
      ? (selected.snapshot as unknown as CoverTemplateDocument)
      : DEFAULT_COVER_TEMPLATE
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
            Every visual cover belongs to one client. Start from either supplied
            reference layout, bind workflow evidence, preview real page
            dimensions, and publish an immutable version.
          </p>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="border-line bg-panel space-y-4 rounded-[9px] border p-5">
          <div>
            <h2 className="font-semibold">Create or clone a draft</h2>
            <p className="text-soft mt-1 text-sm">
              Choose the client first. Templates created here are never global.
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
              name="clientId"
              required
              defaultValue={selectedClientId}
              className="border-edge bg-raise h-9 rounded-[8px] border px-3 text-[12px]"
            >
              <option value="" disabled>
                Choose client
              </option>
              {overview.options.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.code} - {client.name}
                </option>
              ))}
            </select>
            <select
              name="presetId"
              className="border-edge bg-raise h-9 rounded-[8px] border px-3 text-[12px]"
            >
              <option value="">Start from DTG default</option>
              {COVER_TEMPLATE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
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
                  href={`/templates/designer?client=${selectedClientId}&version=${version.id}`}
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
          clientLogoUrl={clientLogoUrl}
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
