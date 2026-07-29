import {
  CLIENT_RESPONSE_FILE_KINDS,
  CLIENT_RESPONSE_OUTCOMES,
} from "@dtg/client-response-domain"
import {
  addResponseCodeAction,
  cloneResponsePolicyAction,
  createNextResponseCodeVersionAction,
  createResponseCodeSetAction,
  publishResponsePolicyAction,
  removeResponseCodeAction,
  reorderResponseCodeAction,
  uploadResponseCodeReferenceAction,
} from "@/server/actions/client-response-policies"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getResponsePolicyAdministration } from "@/server/services/replies/client-response-policy-service"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dtg/card"
import { Input } from "@/components/dtg/input"
import { Label } from "@/components/dtg/label"

export const dynamic = "force-dynamic"

const effects = [
  ["countsAsApproved", "Counts as approved"],
  ["finalApproval", "Final approval"],
  ["requiresCommentRectification", "Rectification required"],
  ["requiresNewRevision", "New revision required"],
  ["requiresInternalReapproval", "Internal reapproval required"],
  ["requiresResubmission", "Resubmission required"],
  ["allowsTemporaryUse", "Temporary use allowed"],
  ["allowsLifecycleClosure", "Closure allowed"],
  ["requiresNewDocumentNumber", "New document number required"],
  ["requiresReturnedFile", "Returned file required"],
] as const

export default async function ResponseCodesPage() {
  const actor = await requireCurrentAppUser()
  const overview = await getResponsePolicyAdministration(actor)
  const drafts = overview.sets.flatMap((set) =>
    set.versions
      .filter((version) => version.status === "Draft")
      .map((version) => ({ set, version }))
  )

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-5 md:px-6">
      <Card className="overflow-hidden border-slate-200 bg-[linear-gradient(135deg,#f7f4ec_0%,#fff_45%,#e8f0ed_100%)]">
        <CardHeader>
          <Badge className="w-fit bg-emerald-900 text-white">
            Policy studio
          </Badge>
          <CardTitle className="max-w-4xl font-serif text-3xl text-slate-950">
            Client response meanings belong to published policy, never to a
            hardcoded number.
          </CardTitle>
        </CardHeader>
      </Card>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create client default draft</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createResponseCodeSetAction} className="grid gap-3">
              <select
                name="clientId"
                required
                className="rounded-md border p-2"
              >
                {overview.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.code} - {client.name}
                  </option>
                ))}
              </select>
              <Input name="code" required placeholder="Policy code" />
              <Input name="name" required placeholder="Policy name" />
              <Input name="description" placeholder="Description" />
              <select name="fixture" className="rounded-md border p-2">
                <option value="NONE">Empty policy</option>
                <option value="AIR_PRODUCTS">
                  Air Products development fixture
                </option>
                <option value="JIGPC">JIGPC development fixture</option>
                <option value="CONDITIONAL_CODE_2">
                  Conditional Code 2 development fixture
                </option>
              </select>
              <SubmitButton label="Create draft" pendingLabel="Creating" />
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clone a version for a project</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={cloneResponsePolicyAction} className="grid gap-3">
              <select
                name="sourceVersionId"
                required
                className="rounded-md border p-2"
              >
                {overview.sets.flatMap((set) =>
                  set.versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {set.name} / v{version.version} / {version.status}
                    </option>
                  ))
                )}
              </select>
              <select
                name="projectId"
                required
                className="rounded-md border p-2"
              >
                {overview.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
              <SubmitButton label="Clone to project" pendingLabel="Cloning" />
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4">
        {overview.sets.map((set) => {
          const latest = set.versions[0]
          const hasDraft = set.versions.some(
            (version) => version.status === "Draft"
          )
          const references = overview.references.filter(
            (reference) => reference.codeSetId === set.id
          )
          return (
            <Card key={set.id}>
              <CardContent className="grid gap-4 pt-6 lg:grid-cols-2">
                <div>
                  <p className="font-semibold">{set.name}</p>
                  <p className="text-muted-foreground text-sm">
                    Latest version: v{latest?.version ?? 0} /{" "}
                    {latest?.status ?? "Empty"}
                  </p>
                  {!hasDraft && latest ? (
                    <form
                      action={createNextResponseCodeVersionAction}
                      className="mt-3"
                    >
                      <input type="hidden" name="codeSetId" value={set.id} />
                      <SubmitButton
                        label="Create next draft version"
                        pendingLabel="Creating version"
                        variant="outline"
                      />
                    </form>
                  ) : null}
                </div>
                <form
                  action={uploadResponseCodeReferenceAction}
                  className="grid gap-2 rounded-xl border p-3"
                >
                  <input type="hidden" name="codeSetId" value={set.id} />
                  <Input
                    name="referenceKind"
                    required
                    placeholder="Procedure or sample type"
                  />
                  <Input
                    name="description"
                    placeholder="Reference description"
                  />
                  <Input name="file" type="file" required />
                  <SubmitButton
                    label="Upload policy reference"
                    pendingLabel="Uploading reference"
                    variant="outline"
                  />
                  {references.map((reference) => (
                    <p
                      key={reference.id}
                      className="text-muted-foreground text-xs"
                    >
                      {reference.referenceKind}:{" "}
                      {reference.file?.fileName ?? "Stored reference"}
                    </p>
                  ))}
                </form>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {drafts.map(({ set, version }) => (
        <Card key={version.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>
                {set.name} / v{version.version}
              </CardTitle>
              <Badge variant="outline">{version.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              {version.codes.map((code, index) => (
                <div
                  key={code.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div>
                    <p className="font-semibold">
                      {code.externalCode} - {code.internalLabel}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {code.exactWording} / {code.outcomeClass}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {index > 0 ? (
                      <form action={reorderResponseCodeAction}>
                        <input type="hidden" name="codeId" value={code.id} />
                        <input type="hidden" name="direction" value="UP" />
                        <SubmitButton
                          label="Move up"
                          pendingLabel="Moving"
                          variant="outline"
                        />
                      </form>
                    ) : null}
                    {index < version.codes.length - 1 ? (
                      <form action={reorderResponseCodeAction}>
                        <input type="hidden" name="codeId" value={code.id} />
                        <input type="hidden" name="direction" value="DOWN" />
                        <SubmitButton
                          label="Move down"
                          pendingLabel="Moving"
                          variant="outline"
                        />
                      </form>
                    ) : null}
                    <form action={removeResponseCodeAction}>
                      <input type="hidden" name="codeId" value={code.id} />
                      <SubmitButton
                        label="Remove"
                        pendingLabel="Removing"
                        variant="outline"
                      />
                    </form>
                  </div>
                </div>
              ))}
            </div>

            <form
              action={addResponseCodeAction}
              className="grid gap-4 rounded-2xl border bg-slate-50 p-4"
            >
              <input type="hidden" name="versionId" value={version.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  name="externalCode"
                  required
                  placeholder="Code: 2, A, IFC"
                />
                <Input
                  name="internalLabel"
                  required
                  placeholder="Internal label"
                />
                <Input
                  name="exactWording"
                  required
                  placeholder="Exact client wording"
                />
                <Input
                  name="displayOrder"
                  type="number"
                  defaultValue={version.codes.length + 1}
                />
                <select name="outcomeClass" className="rounded-md border p-2">
                  {CLIENT_RESPONSE_OUTCOMES.map((outcome) => (
                    <option key={outcome}>{outcome}</option>
                  ))}
                </select>
                <select
                  name="expectedPrimaryFileKind"
                  className="rounded-md border p-2"
                >
                  <option value="">Any returned file kind</option>
                  {CLIENT_RESPONSE_FILE_KINDS.map((kind) => (
                    <option key={kind}>{kind}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {effects.map(([name, label]) => (
                  <Label key={name} className="flex items-center gap-2">
                    <input name={name} type="checkbox" />
                    {label}
                  </Label>
                ))}
              </div>
              <SubmitButton label="Add code" pendingLabel="Adding" />
            </form>

            <form action={publishResponsePolicyAction} className="flex gap-3">
              <input type="hidden" name="versionId" value={version.id} />
              <select
                name="projectId"
                className="min-w-72 rounded-md border p-2"
              >
                <option value="">Publish as client default</option>
                {overview.projects
                  .filter((project) => project.clientId === set.clientId)
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      Project override: {project.code}
                    </option>
                  ))}
              </select>
              <SubmitButton
                label="Validate and publish"
                pendingLabel="Publishing"
              />
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
