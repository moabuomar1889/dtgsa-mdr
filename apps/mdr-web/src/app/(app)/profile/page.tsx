import Image from "next/image"
import { updateProfileAction } from "@/server/actions/profile"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getProfileOverview } from "@/server/services/signatures/signature-profile-service"
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

export default async function ProfilePage() {
  const user = await requireCurrentAppUser()
  const overview = await getProfileOverview(user.id)

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <Card className="border-line bg-panel">
        <CardHeader className="border-line bg-head gap-2 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg w-fit rounded-[4px] px-1.5 py-0.5">
              Account
            </Badge>
            <Badge variant="outline">
              {overview.user.signatureProfile?.signatureProviderKey
                ? "Signature ready"
                : "Signature pending"}
            </Badge>
          </div>
          <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
            Profile details and signature assets now live in the platform.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            Update your account details, timezone, and signing assets here.
            Workflow signing now depends on this profile being configured
            cleanly.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={updateProfileAction} className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="profile-full-name">Full name</Label>
                <Input
                  id="profile-full-name"
                  name="fullName"
                  defaultValue={overview.user.fullName}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  value={overview.user.email}
                  readOnly
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-job-title">Job title</Label>
                <Input
                  id="profile-job-title"
                  name="jobTitle"
                  defaultValue={overview.user.jobTitle ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-timezone">Timezone</Label>
                <Input
                  id="profile-timezone"
                  name="timezone"
                  defaultValue={overview.user.timezone}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="border-line bg-raise rounded-[9px] border p-4">
                <div className="mb-3 space-y-1">
                  <p className="font-medium">Signature image</p>
                  <p className="text-soft text-sm">
                    Upload the image used in prepared, reviewed, and approved
                    signing events.
                  </p>
                </div>
                {overview.signatureUrl ? (
                  <div className="border-line bg-raise relative mb-4 h-28 rounded-[9px] border p-2">
                    <Image
                      src={overview.signatureUrl}
                      alt="Signature preview"
                      fill
                      unoptimized
                      className="object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="border-line text-soft mb-4 rounded-[9px] border border-dashed p-4 text-sm">
                    No signature image uploaded yet.
                  </div>
                )}
                <Input name="signatureFile" type="file" accept="image/*" />
              </div>

              <div className="border-line bg-raise rounded-[9px] border p-4">
                <div className="mb-3 space-y-1">
                  <p className="font-medium">Initials image</p>
                  <p className="text-soft text-sm">
                    Optional initials image for compact stamps and future PDF
                    tooling.
                  </p>
                </div>
                {overview.initialsUrl ? (
                  <div className="border-line bg-raise relative mb-4 h-28 rounded-[9px] border p-2">
                    <Image
                      src={overview.initialsUrl}
                      alt="Initials preview"
                      fill
                      unoptimized
                      className="object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="border-line text-soft mb-4 rounded-[9px] border border-dashed p-4 text-sm">
                    No initials image uploaded yet.
                  </div>
                )}
                <Input name="initialsFile" type="file" accept="image/*" />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="border-line bg-raise rounded-[9px] border p-4">
                <p className="text-soft text-sm">Signature profile</p>
                <p className="mt-2 text-xl font-semibold tracking-tight">
                  {overview.user.signatureProfile ? "Configured" : "Pending"}
                </p>
                <p className="text-soft mt-2 text-sm leading-6">
                  Signature events recorded:{" "}
                  {overview.user.signatureEvents.length}
                </p>
              </div>
              <div className="border-line bg-raise rounded-[9px] border p-4">
                <p className="text-soft text-sm">Recent signing activity</p>
                <div className="mt-2 grid gap-2">
                  {overview.user.signatureEvents.length > 0 ? (
                    overview.user.signatureEvents.map((event) => (
                      <div key={event.id} className="text-soft text-sm">
                        {event.workflowStepType} on{" "}
                        {event.signedAt.toLocaleString("en-US")}
                      </div>
                    ))
                  ) : (
                    <div className="text-soft text-sm">
                      No signing events recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <SubmitButton
              label="Save profile"
              pendingLabel="Saving profile"
              className="w-full md:w-fit"
            />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
