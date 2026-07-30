import {
  approveIdentityLinkReviewAction,
  inviteExternalPortalUserAction,
  replaceExternalInvitationAction,
  revokeExternalInvitationAction,
  saveGoogleGroupMappingAction,
  synchronizeDirectoryAction,
} from "@/server/actions/identity-admin"
import { getIdentityAdminOverview } from "@/server/services/identity/identity-admin-service"
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
import { Label } from "@/components/dtg/label"

export const dynamic = "force-dynamic"

export default async function IdentityAdministrationPage() {
  const overview = await getIdentityAdminOverview()

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-line bg-panel overflow-hidden">
          <CardHeader className="border-line bg-head border-b">
            <div className="flex flex-wrap gap-2">
              <Badge>Identity control</Badge>
              <Badge variant="outline">Google subject authority</Badge>
            </div>
            <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
              Workspace identity and client access
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              Group mappings are versioned, directory synchronization is
              reconciled, and external invitations remain isolated from employee
              roles and sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-4">
            {[
              ["Mappings", overview.mappings.length],
              ["Invitations", overview.invitations.length],
              ["Sync runs", overview.syncRuns.length],
              ["Link reviews", overview.linkReviews.length],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="border-line bg-raise rounded-[9px] border p-4"
              >
                <p className="text-soft text-sm">{label}</p>
                <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                  {value}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Directory reconciliation</CardTitle>
            <CardDescription>
              Dry-run first. Live synchronization remains disabled until
              delegated credentials are explicitly configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <form action={synchronizeDirectoryAction}>
              <input type="hidden" name="dryRun" value="true" />
              <SubmitButton
                label="Run directory dry-run"
                pendingLabel="Reconciling"
                className="w-full"
              />
            </form>
            <form action={synchronizeDirectoryAction}>
              <SubmitButton
                label="Run authorized live sync"
                pendingLabel="Synchronizing"
                variant="outline"
                className="w-full"
              />
            </form>
            <div className="space-y-2 pt-2">
              {overview.syncRuns.slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-[10px] border p-3 text-sm"
                >
                  <span>{run.startedAt.toISOString()}</span>
                  <Badge variant="outline">{run.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Versioned group mapping</CardTitle>
            <CardDescription>
              Map an immutable Google group ID to a system or project role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={saveGoogleGroupMappingAction} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="group-id">Google group ID</Label>
                <Input id="group-id" name="groupId" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-2 text-sm">
                  Platform role
                  <select
                    name="roleCode"
                    className="bg-bg h-10 rounded-[7px] border px-3"
                  >
                    {overview.roles.map((role) => (
                      <option key={role.id} value={role.code}>
                        {role.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  Project scope
                  <select
                    name="projectId"
                    className="bg-bg h-10 rounded-[7px] border px-3"
                  >
                    <option value="">System role</option>
                    {overview.projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  Department
                  <select
                    name="departmentId"
                    className="bg-bg h-10 rounded-[7px] border px-3"
                  >
                    <option value="">No department</option>
                    {overview.departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.code}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked />
                Mapping is active
              </label>
              <SubmitButton label="Save mapping" pendingLabel="Saving" />
            </form>

            <div className="space-y-2">
              {overview.mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="rounded-[10px] border p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <code>{mapping.groupId}</code>
                    <Badge variant={mapping.isActive ? "default" : "outline"}>
                      {mapping.roleCode}
                    </Badge>
                  </div>
                  <p className="text-soft mt-2 text-xs">
                    Version {mapping.versions[0]?.version ?? 0}
                    {mapping.projectId ? ` · Project ${mapping.projectId}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>External portal invitation</CardTitle>
            <CardDescription>
              The raw token is sent directly through the configured email
              adapter and is never persisted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              action={inviteExternalPortalUserAction}
              className="grid gap-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  name="fullName"
                  placeholder="Client contact name"
                  required
                />
                <Input
                  name="email"
                  type="email"
                  placeholder="client@example.com"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  name="clientId"
                  className="bg-bg h-10 rounded-[7px] border px-3"
                  required
                >
                  {overview.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.code}
                    </option>
                  ))}
                </select>
                <select
                  name="projectId"
                  className="bg-bg h-10 rounded-[7px] border px-3"
                >
                  <option value="">All client projects</option>
                  {overview.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code}
                    </option>
                  ))}
                </select>
                <select
                  name="usePolicy"
                  className="bg-bg h-10 rounded-[7px] border px-3"
                >
                  <option value="OneTime">One-time</option>
                  <option value="Reusable">Controlled reusable</option>
                </select>
              </div>
              <Input
                name="pdiItemIds"
                placeholder="Optional comma-separated PDI item IDs"
              />
              <SubmitButton
                label="Create and deliver invitation"
                pendingLabel="Delivering"
              />
            </form>

            <div className="space-y-2">
              {overview.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-[10px] border p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{invitation.identity.identity.user.email}</span>
                    <Badge variant="outline">
                      {invitation.revokedAt
                        ? "Revoked"
                        : invitation.expiresAt <= new Date()
                          ? "Expired"
                          : "Active"}
                    </Badge>
                  </div>
                  {!invitation.revokedAt ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={replaceExternalInvitationAction}>
                        <input
                          type="hidden"
                          name="invitationId"
                          value={invitation.id}
                        />
                        <SubmitButton
                          label="Replace and resend"
                          pendingLabel="Replacing"
                          size="sm"
                        />
                      </form>
                      <form action={revokeExternalInvitationAction}>
                        <input
                          type="hidden"
                          name="invitationId"
                          value={invitation.id}
                        />
                        <SubmitButton
                          label="Revoke invitation"
                          pendingLabel="Revoking"
                          variant="outline"
                          size="sm"
                        />
                      </form>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {overview.linkReviews.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Account-link reviews</CardTitle>
            <CardDescription>
              Approve one known candidate. The immutable Google subject is
              linked only after the employee completes a fresh OIDC sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.linkReviews.map((review) => {
              const candidates = Array.isArray(review.candidateUserIds)
                ? review.candidateUserIds.filter(
                    (candidate): candidate is string =>
                      typeof candidate === "string"
                  )
                : []
              return (
                <form
                  key={review.id}
                  action={approveIdentityLinkReviewAction}
                  className="grid gap-3 rounded-[10px] border p-4 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <input type="hidden" name="reviewId" value={review.id} />
                  <div>
                    <p className="font-medium">{review.email}</p>
                    <p className="text-soft text-xs">
                      Subject fingerprint: {review.subjectHash.slice(0, 16)}
                    </p>
                  </div>
                  <select
                    name="selectedUserId"
                    className="bg-bg h-10 rounded-[7px] border px-3"
                    required
                  >
                    {candidates.map((candidate) => (
                      <option key={candidate} value={candidate}>
                        {candidate}
                      </option>
                    ))}
                  </select>
                  <SubmitButton
                    label="Approve link"
                    pendingLabel="Approving"
                    size="sm"
                  />
                </form>
              )
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
