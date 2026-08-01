import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { COVER_TEMPLATE_PRESETS } from "@dtg/cover-designer"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { RegisterPanel } from "@/components/app/register-panel"
import { RegisterWorkspace } from "@/components/app/register-workspace"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
import { Button } from "@/components/dtg/button"
import { Input } from "@/components/dtg/input"
import { Label } from "@/components/dtg/label"
import {
  clearClientLogoAction,
  setClientLogoAction,
  updateClientPreferencesAction,
} from "@/server/actions/clients"
import { createVisualCoverDraftAction } from "@/server/actions/templates"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { getClientWorkspace } from "@/server/services/clients/client-management"

export const dynamic = "force-dynamic"

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export default async function ClientWorkspacePage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const actor = await requireCurrentAppUser()
  requireUserHasAnyPermission(actor, PERMISSIONS.clientsManage)
  const { clientId } = await params
  const workspace = await getClientWorkspace(clientId)
  if (!workspace) notFound()

  const { client, visualVersions } = workspace
  const settings = asObject(client.setting?.settings)
  const templateSettings = asObject(client.setting?.templateSettings)
  const logoUrl = client.logoBase64
    ? `data:${client.logoMimeType ?? "image/png"};base64,${client.logoBase64}`
    : null

  return (
    <RegisterWorkspace
      eyebrow="Client workspace"
      title={`${client.code} - ${client.name}`}
      description="Client preferences, brand assets, and cover sheets live here so projects inherit the correct rules without global template conflicts."
      metrics={[
        { label: "Projects", value: client.projects.length },
        { label: "Contacts", value: client.contacts.length },
        { label: "Visual covers", value: visualVersions.length },
        {
          label: "Status",
          value: client.isActive ? "Active" : "Inactive",
        },
      ]}
      actions={[
        {
          label: "Open cover designer",
          title: "Create an editable client cover",
          description:
            "Choose one supplied layout or clone an existing client version. The new draft is owned by this client only.",
          intent: "create",
          width: "lg",
          panel: (
            <div className="grid gap-3">
              {COVER_TEMPLATE_PRESETS.map((preset) => (
                <form
                  key={preset.id}
                  action={createVisualCoverDraftAction}
                  className="border-line bg-raise grid gap-3 rounded-[10px] border p-4"
                >
                  <input type="hidden" name="clientId" value={client.id} />
                  <input type="hidden" name="presetId" value={preset.id} />
                  <input type="hidden" name="code" value={preset.id} />
                  <input type="hidden" name="name" value={preset.label} />
                  <div>
                    <p className="text-sm font-semibold">{preset.label}</p>
                    <p className="text-soft mt-1 text-xs leading-5">
                      {preset.description}
                    </p>
                  </div>
                  <SubmitButton
                    label="Create editable draft"
                    pendingLabel="Creating draft"
                    className="w-full"
                  />
                </form>
              ))}
              <Button asChild variant="outline">
                <Link href={`/templates/designer?client=${client.id}`}>
                  Open all client cover versions
                </Link>
              </Button>
            </div>
          ),
        },
      ]}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <RegisterPanel
          title="Client preferences"
          description="These defaults are inherited by new projects and document-control operations for this client."
        >
          <form action={updateClientPreferencesAction} className="grid gap-4">
            <input type="hidden" name="clientId" value={client.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="client-timezone">Default timezone</Label>
                <Input
                  id="client-timezone"
                  name="defaultTimezone"
                  defaultValue={client.defaultTimezone ?? "Asia/Riyadh"}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-response-days">
                  Client response target (days)
                </Label>
                <Input
                  id="client-response-days"
                  name="defaultResponseDays"
                  type="number"
                  min="1"
                  max="365"
                  defaultValue={Number(settings.defaultResponseDays ?? 14)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-upload-limit">Upload limit (MB)</Label>
                <Input
                  id="client-upload-limit"
                  name="defaultUploadMaxMb"
                  type="number"
                  min="1"
                  max="2048"
                  defaultValue={client.setting?.defaultUploadMaxMb ?? 100}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-transmittal-limit">
                  Transmittal limit (MB)
                </Label>
                <Input
                  id="client-transmittal-limit"
                  name="defaultTransmittalMaxMb"
                  type="number"
                  min="1"
                  max="4096"
                  defaultValue={client.setting?.defaultTransmittalMaxMb ?? 500}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-transmittal-purpose">
                Default transmittal purpose
              </Label>
              <Input
                id="client-transmittal-purpose"
                name="defaultTransmittalPurpose"
                defaultValue={String(
                  settings.defaultTransmittalPurpose ?? "Issued for review"
                )}
              />
            </div>
            <div className="border-line grid gap-3 rounded-[10px] border p-4 md:grid-cols-2">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="requireClientCover"
                  defaultChecked={templateSettings.requireClientCover !== false}
                />
                Require the client cover
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="includeDtgsaCover"
                  defaultChecked={templateSettings.includeDtgsaCover !== false}
                />
                Include the DTGSA cover
              </label>
            </div>
            <SubmitButton
              label="Save client preferences"
              pendingLabel="Saving preferences"
            />
          </form>
        </RegisterPanel>

        <div className="grid content-start gap-3">
          <RegisterPanel
            title="Client logo"
            description="The logo is inserted into browser-designed covers through the client.logo binding."
          >
            <div className="grid gap-4">
              <div className="border-line bg-raise flex min-h-28 items-center justify-center rounded-[10px] border p-4">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={`${client.name} logo`}
                    width={240}
                    height={96}
                    unoptimized
                    className="max-h-20 w-auto object-contain"
                  />
                ) : (
                  <p className="text-soft text-xs">No client logo uploaded</p>
                )}
              </div>
              <form action={setClientLogoAction} className="grid gap-3">
                <input type="hidden" name="clientId" value={client.id} />
                <Input
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  required
                />
                <SubmitButton
                  label="Upload client logo"
                  pendingLabel="Uploading logo"
                  variant="outline"
                />
              </form>
              {logoUrl ? (
                <form action={clearClientLogoAction}>
                  <input type="hidden" name="clientId" value={client.id} />
                  <SubmitButton
                    label="Remove logo"
                    pendingLabel="Removing logo"
                    variant="ghost"
                    className="w-full"
                  />
                </form>
              ) : null}
            </div>
          </RegisterPanel>

          <RegisterPanel
            title="Editable cover versions"
            description="Only versions scoped to this client are shown. Published versions stay immutable."
          >
            <div className="grid gap-2">
              {visualVersions.length > 0 ? (
                visualVersions.map((version) => (
                  <Link
                    key={version.id}
                    href={`/templates/designer?client=${client.id}&version=${version.id}`}
                    className="border-line hover:bg-raise flex items-center justify-between gap-3 rounded-[9px] border px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {version.template.name}
                      </span>
                      <span className="text-soft block text-xs">
                        {version.template.code} / v{version.version}
                      </span>
                    </span>
                    <Badge variant="outline">{version.status}</Badge>
                  </Link>
                ))
              ) : (
                <p className="text-soft py-4 text-center text-xs">
                  No editable client cover has been created yet.
                </p>
              )}
            </div>
          </RegisterPanel>
        </div>
      </div>
    </RegisterWorkspace>
  )
}
