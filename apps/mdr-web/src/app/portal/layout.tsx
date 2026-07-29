import Link from "next/link"
import { signOutAction } from "@/server/actions/auth"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { Button } from "@/components/ui/button"

export default async function PortalLayout({
  children,
}: LayoutProps<"/portal">) {
  const user = await requireCurrentAppUser()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Client Portal</p>
            <h1 className="text-xl font-semibold tracking-tight">DTGSA PDI Collaboration</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:block">
              {user.fullName}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Internal app</Link>
            </Button>
            <form action={signOutAction}>
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
