import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getUserPermissions } from "@/server/services/auth/permission-service"
import { countUnreadNotificationsForUser } from "@/server/services/notifications/notification-service"
import { getShellOverview } from "@/server/services/shell/shell-overview"

// Both shell slots resolve the same request-cached session and shell overview,
// so rendering them under separate Suspense boundaries costs one set of
// queries, not two.
export async function AppShellHeader() {
  const user = await requireCurrentAppUser()
  const [unreadNotificationCount, overview] = await Promise.all([
    countUnreadNotificationsForUser(user.id),
    getShellOverview(user),
  ])

  return (
    <SiteHeader
      user={{ name: user.fullName, email: user.email, avatar: "" }}
      unreadNotificationCount={unreadNotificationCount}
      projects={overview.projects}
      projectCount={overview.counts.projects}
    />
  )
}

export function AppShellHeaderFallback() {
  return (
    <header
      aria-hidden="true"
      className="border-line bg-head z-40 flex h-[50px] shrink-0 items-center gap-3 border-b px-3 md:px-4"
    >
      <span className="flex w-auto items-center gap-2 px-1 py-1 md:w-[177px]">
        <span className="border-accent text-accent size-5 rounded-[5px] border" />
        <span className="text-[12.5px] font-semibold">
          DTGSA <span className="text-dim font-normal">/ MDR</span>
        </span>
      </span>
      <span className="border-line ml-auto size-7 rounded-[7px] border" />
    </header>
  )
}

export async function AppShellSidebar({ className }: { className?: string }) {
  const user = await requireCurrentAppUser()
  const overview = await getShellOverview(user)

  return (
    <AppSidebar
      className={className}
      // The primitive hardcodes `h-svh`, which a utility class cannot reliably
      // override. The shell sits below a 50px header, so pin the height here.
      style={{ height: "calc(100svh - var(--header-height))" }}
      permissions={getUserPermissions(user)}
      overview={overview}
    />
  )
}

export function AppShellSidebarFallback() {
  return (
    <div
      aria-hidden="true"
      className="border-line bg-panel2 hidden w-[var(--sidebar-width)] shrink-0 border-r md:block"
    />
  )
}
