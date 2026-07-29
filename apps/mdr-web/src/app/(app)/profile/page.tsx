import Image from "next/image"
import { updateProfileAction } from "@/server/actions/profile"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getProfileOverview } from "@/server/services/signatures/signature-profile-service"
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
import { Label } from "@/components/ui/label"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const user = await requireCurrentAppUser()
  const overview = await getProfileOverview(user.id)

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="w-fit rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
              Account
            </Badge>
            <Badge variant="outline">
              {overview.user.signatureProfile?.signatureFilePath
                ? "Signature ready"
                : "Signature pending"}
            </Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Profile details and signature assets now live in the platform.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            Update your account details, timezone, and signing assets here.
            Workflow signing now depends on this profile being configured cleanly.
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
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-3 space-y-1">
                  <p className="font-medium">Signature image</p>
                  <p className="text-sm text-muted-foreground">
                    Upload the image used in prepared, reviewed, and approved
                    signing events.
                  </p>
                </div>
                {overview.signatureUrl ? (
                  <div className="relative mb-4 h-28 rounded-lg border border-border/60 bg-white p-2">
                    <Image
                      src={overview.signatureUrl}
                      alt="Signature preview"
                      fill
                      unoptimized
                      className="object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="mb-4 rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    No signature image uploaded yet.
                  </div>
                )}
                <Input name="signatureFile" type="file" accept="image/*" />
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-3 space-y-1">
                  <p className="font-medium">Initials image</p>
                  <p className="text-sm text-muted-foreground">
                    Optional initials image for compact stamps and future PDF
                    tooling.
                  </p>
                </div>
                {overview.initialsUrl ? (
                  <div className="relative mb-4 h-28 rounded-lg border border-border/60 bg-white p-2">
                    <Image
                      src={overview.initialsUrl}
                      alt="Initials preview"
                      fill
                      unoptimized
                      className="object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="mb-4 rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    No initials image uploaded yet.
                  </div>
                )}
                <Input name="initialsFile" type="file" accept="image/*" />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <p className="text-sm text-muted-foreground">Signature profile</p>
                <p className="mt-2 text-xl font-semibold tracking-tight">
                  {overview.user.signatureProfile ? "Configured" : "Pending"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Signature events recorded: {overview.user.signatureEvents.length}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <p className="text-sm text-muted-foreground">Recent signing activity</p>
                <div className="mt-2 grid gap-2">
                  {overview.user.signatureEvents.length > 0 ? (
                    overview.user.signatureEvents.map((event) => (
                      <div key={event.id} className="text-sm text-muted-foreground">
                        {event.workflowStepType} on {event.signedAt.toLocaleString("en-US")}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
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
