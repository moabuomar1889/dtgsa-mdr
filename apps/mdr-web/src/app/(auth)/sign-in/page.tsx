import { redirect } from "next/navigation"
import { setupFirstAdminAction, signInAction } from "@/server/actions/auth"
import {
  getAuthSetupState,
  getCurrentAuthUser,
} from "@/server/services/auth/auth-service"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { getIdentityConfig } from "@/server/services/identity/identity-config"

export const dynamic = "force-dynamic"

type SignInPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const identityConfig = getIdentityConfig()
  const [authUser, setupState] = await Promise.all([
    getCurrentAuthUser(),
    getAuthSetupState(),
  ])
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
  const defaultTab = setupState.requiresBootstrap ? "setup" : "sign-in"
  const passwordEnabled =
    identityConfig.authMode !== "GOOGLE_WORKSPACE" &&
    process.env.NODE_ENV !== "production"

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="border-border/60 from-primary/12 gap-3 border-b bg-gradient-to-br via-transparent to-transparent">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15 rounded-full px-3 py-1">
              DTGSA Document Control
            </Badge>
            <Badge variant="outline">
              {setupState.requiresBootstrap
                ? "Bootstrap required"
                : "Secure sign in"}
            </Badge>
          </div>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            Enterprise access for PDI, MDR, workflow, transmittals, and audit
            control.
          </CardTitle>
          <CardDescription className="max-w-2xl leading-6">
            Internal employees use Google Workspace identity in the target mode.
            Legacy password access is displayed only for explicitly configured
            development or transition environments.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 md:grid-cols-3">
          <div className="border-border/60 bg-background/80 rounded-2xl border p-4">
            <p className="text-muted-foreground text-sm">Auth provider</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {identityConfig.googleEnabled ? "Google Workspace" : "Supabase"}
            </p>
          </div>
          <div className="border-border/60 bg-background/80 rounded-2xl border p-4">
            <p className="text-muted-foreground text-sm">Workspace mode</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              Protected app routes
            </p>
          </div>
          <div className="border-border/60 bg-background/80 rounded-2xl border p-4">
            <p className="text-muted-foreground text-sm">Bootstrap state</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {setupState.requiresBootstrap ? "Create first admin" : "Ready"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Access</CardTitle>
          <CardDescription>
            Google identity is linked by immutable subject. Password access is
            never available in the production target mode.
          </CardDescription>
          {errorMessage ? (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
              {errorMessage}
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="grid gap-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sign-in">Sign in</TabsTrigger>
              <TabsTrigger
                value="setup"
                disabled={!setupState.requiresBootstrap}
              >
                First admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sign-in">
              <div className="grid gap-4">
                {identityConfig.googleEnabled ? (
                  <Button asChild className="w-full">
                    <a href="/api/auth/google/start">
                      Continue with Google Workspace
                    </a>
                  </Button>
                ) : null}
                {passwordEnabled ? (
                  <form action={signInAction} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="sign-in-email">Email</Label>
                      <Input
                        id="sign-in-email"
                        name="email"
                        type="email"
                        placeholder="name@dtgsa.com"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sign-in-password">Password</Label>
                      <Input
                        id="sign-in-password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    <SubmitButton label="Sign in" pendingLabel="Signing in" />
                  </form>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="setup">
              {setupState.requiresBootstrap && passwordEnabled ? (
                <form action={setupFirstAdminAction} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="setup-full-name">Full name</Label>
                    <Input
                      id="setup-full-name"
                      name="fullName"
                      placeholder="DTGSA Administrator"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="setup-job-title">Job title</Label>
                    <Input
                      id="setup-job-title"
                      name="jobTitle"
                      placeholder="System Administrator"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="setup-email">Email</Label>
                    <Input
                      id="setup-email"
                      name="email"
                      type="email"
                      placeholder="admin@dtgsa.com"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="setup-password">Password</Label>
                    <Input
                      id="setup-password"
                      name="password"
                      type="password"
                      minLength={8}
                      required
                    />
                  </div>
                  <SubmitButton
                    label="Create first admin"
                    pendingLabel="Creating admin"
                  />
                </form>
              ) : (
                <div className="border-border/70 bg-background/80 text-muted-foreground rounded-2xl border border-dashed p-6 text-sm leading-6">
                  Bootstrap setup has already been completed. Use the sign-in
                  tab with an existing account.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
