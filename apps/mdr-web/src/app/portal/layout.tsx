import { getCurrentExternalPortalSession } from "@/server/services/identity/external-portal-service"
import { Button } from "@/components/ui/button"

export default async function PortalLayout({
  children,
}: LayoutProps<"/portal">) {
  const session = await getCurrentExternalPortalSession()
  if (!session) return children
  const user = session.identity.identity.user

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/60 bg-background/90 border-b backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Client Portal</p>
            <h1 className="text-xl font-semibold tracking-tight">
              DTGSA PDI Collaboration
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden text-sm md:block">
              {user.fullName}
            </span>
            <form action="/api/portal/logout" method="post">
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
