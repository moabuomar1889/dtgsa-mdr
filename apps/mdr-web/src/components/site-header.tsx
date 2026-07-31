"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BellIcon,
  FileCheck2Icon,
  LogOutIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
} from "lucide-react"
import { signOutAction } from "@/server/actions/auth"
import { useTheme } from "@/components/dtg/theme-provider"
import { NavUser } from "@/components/nav-user"
import { ProjectSwitcher } from "@/components/app/project-switcher"
import { SidebarTrigger } from "@/components/dtg/sidebar"
import type { ShellProjectOption } from "@/server/services/shell/shell-overview"

type HeaderUser = {
  name: string
  email: string
  avatar: string
}

const titleMap: Record<string, string> = {
  "/dashboard": "System Dashboard",
  "/projects": "Projects",
  "/projects/new": "New Project",
  "/pdi": "Project Document Index",
  "/mdr": "Master Document Register",
  "/transmittals": "Transmittals",
  "/replies": "Client Replies",
  "/pdf-tools": "PDF Tools",
  "/audit": "Audit Log",
  "/settings": "Settings",
  "/admin/users": "Users & Roles",
  "/admin/identity": "Identity Control",
  "/search": "Search",
  "/tasks": "Task Dashboard",
  "/templates": "Templates",
  "/reports": "Reporting",
  "/clients": "Clients",
  "/masters": "Masters",
  "/profile": "Account",
  "/notifications": "Notifications",
}

export function SiteHeader({
  user,
  unreadNotificationCount,
  projects,
  projectCount,
}: {
  user: HeaderUser
  unreadNotificationCount: number
  projects: ShellProjectOption[]
  projectCount: number
}) {
  const pathname = usePathname()
  const { mode, toggleMode } = useTheme()
  const title = titleMap[pathname] ?? "DTGSA Document Control"

  return (
    <header className="border-line bg-head z-40 flex h-[50px] shrink-0 items-center gap-3 border-b px-3 md:px-4">
      <SidebarTrigger className="border-edge text-soft size-7 border md:hidden" />
      <Link
        href="/dashboard"
        className="flex w-auto shrink-0 items-center gap-2 rounded-[7px] px-1 py-1 whitespace-nowrap md:w-[177px]"
        data-h
      >
        <span className="border-accent text-accent flex size-5 items-center justify-center rounded-[5px] border">
          <FileCheck2Icon className="size-3" />
        </span>
        <span className="text-[12.5px] font-semibold">
          DTGSA <span className="text-dim font-normal">/ MDR</span>
        </span>
      </Link>

      <div className="hidden shrink-0 lg:block">
        <ProjectSwitcher projects={projects} projectCount={projectCount} />
      </div>

      <Link
        href="/search"
        aria-label="Search documents, PDI, and transmittals"
        className="border-line text-dim flex min-w-0 flex-1 items-center gap-2 rounded-[7px] border px-2.5 py-1.5 text-[11.5px] md:max-w-[300px]"
        data-b
      >
        <SearchIcon className="size-3.5 shrink-0" />
        <span className="truncate">Search documents, PDI, transmittals...</span>
        <span className="border-edge ml-auto hidden rounded-[4px] border px-1 font-mono text-[9.5px] sm:inline">
          Ctrl K
        </span>
      </Link>

      <div className="text-muted ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap">
        <span className="text-dim hidden text-[10px] xl:inline">{title}</span>
        <button
          type="button"
          onClick={toggleMode}
          aria-label={`Use ${mode === "dark" ? "light" : "dark"} theme`}
          className="border-edge bg-raise text-soft flex shrink-0 items-center gap-1.5 rounded-[7px] border px-2.5 py-[5px] text-[11.5px] whitespace-nowrap"
          data-b
        >
          {mode === "dark" ? (
            <SunIcon className="size-3.5" />
          ) : (
            <MoonIcon className="size-3.5" />
          )}
          <span className="hidden sm:inline">
            {mode === "dark" ? "Light" : "Dark"}
          </span>
        </button>
        <Link
          href="/notifications"
          className="relative flex size-7 items-center justify-center rounded-[7px]"
          aria-label={
            unreadNotificationCount > 0
              ? `Notifications, ${unreadNotificationCount} unread`
              : "Notifications"
          }
          data-h
        >
          <BellIcon className="size-3.5" />
          {unreadNotificationCount > 0 ? (
            <span className="text-on-accent absolute -top-0.5 -right-0.5 flex min-w-3.5 items-center justify-center rounded-full bg-[var(--accent)] px-0.5 font-mono text-[8px] font-semibold">
              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
            </span>
          ) : null}
        </Link>
        <div className="bg-line h-5 w-px" />
        <NavUser user={user} />
        {/* Design §4 keeps sign-out reachable in one click beside the user
            block, not only inside the account menu. */}
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="text-dim flex size-7 items-center justify-center rounded-[7px]"
            data-h
          >
            <LogOutIcon className="size-3.5" />
          </button>
        </form>
      </div>
    </header>
  )
}
