import { redirect } from "next/navigation"
import { getCurrentAuthUser } from "@/server/services/auth/auth-service"
import { Badge } from "@/components/dtg/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"
import { Button } from "@/components/dtg/button"
import { getIdentityConfig } from "@/server/services/identity/identity-config"

export const dynamic = "force-dynamic"

type SignInPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const identityConfig = getIdentityConfig()
  const authUser = await getCurrentAuthUser()
  const params = ((await searchParams) ?? {}) as Record<
    string,
    string | string[] | undefined
  >

  if (authUser) {
    redirect("/dashboard")
  }

  const rawError = params.error
  const errorMessage =
    typeof rawError === "string"
      ? decodeURIComponent(rawError)
      : Array.isArray(rawError) && rawError[0]
        ? decodeURIComponent(rawError[0])
        : null
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-line bg-panel">
        <CardHeader className="border-line bg-head gap-2 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
              DTGSA Document Control
            </Badge>
            <Badge variant="outline">Secure sign in</Badge>
          </div>
          <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
            Enterprise access for PDI, MDR, workflow, transmittals, and audit
            control.
          </CardTitle>
          <CardDescription className="max-w-2xl leading-6">
            Internal employees use Google Workspace identity in the target
            environment. Local acceptance uses isolated synthetic identities and
            is unavailable in production.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 md:grid-cols-3">
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Auth provider</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {identityConfig.googleEnabled
                ? "Google Workspace"
                : "Local acceptance"}
            </p>
          </div>
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Workspace mode</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              Protected app routes
            </p>
          </div>
          <div className="border-line bg-raise rounded-[9px] border p-4">
            <p className="text-soft text-sm">Session authority</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              PostgreSQL
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-line bg-panel">
        <CardHeader>
          <CardTitle className="text-lg">Access</CardTitle>
          <CardDescription>
            Google identity is linked by immutable subject. Password access is
            not part of the platform identity model.
          </CardDescription>
          {errorMessage ? (
            <div className="border-bad/30 bg-bad/10 text-bad rounded-[10px] border px-3 py-2 text-sm">
              {errorMessage}
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button asChild className="w-full">
              <a
                href={
                  identityConfig.googleEnabled
                    ? "/api/auth/google/start"
                    : "/local-acceptance"
                }
              >
                {identityConfig.googleEnabled
                  ? "Continue with Google Workspace"
                  : "Choose a synthetic local identity"}
              </a>
            </Button>
            <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-4 text-sm leading-6">
              {identityConfig.googleEnabled
                ? "Your Workspace account must belong to an approved domain and be linked to an active platform user."
                : "Local acceptance identities are test-only records restricted to the loopback runtime."}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
