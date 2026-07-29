"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BellIcon,
  FileCheck2Icon,
  FolderKanbanIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
} from "lucide-react"
import { useTheme } from "@/components/dtg/theme-provider"
import { NavUser } from "@/components/nav-user"
import { SidebarTrigger } from "@/components/dtg/sidebar"

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

export function SiteHeader({ user }: { user: HeaderUser }) {
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

      <Link
        href="/projects"
        className="border-edge bg-raise text-muted hidden shrink-0 items-center gap-2 rounded-[7px] border px-2.5 py-1.5 text-[11.5px] whitespace-nowrap lg:flex"
        data-b
      >
        <FolderKanbanIcon className="text-accent size-3.5" />
        <span className="text-accent font-mono text-[10px]">ALL</span>
        <span className="max-w-40 truncate">Project portfolio</span>
      </Link>

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
          className="border-edge bg-raise text-soft flex size-7 items-center justify-center rounded-[7px] border"
          data-b
        >
          {mode === "dark" ? (
            <SunIcon className="size-3.5" />
          ) : (
            <MoonIcon className="size-3.5" />
          )}
        </button>
        <Link
          href="/notifications"
          className="relative flex size-7 items-center justify-center rounded-[7px]"
          aria-label="Notifications"
          data-h
        >
          <BellIcon className="size-3.5" />
          <span className="bg-accent text-on-accent absolute -top-0.5 -right-0.5 flex min-w-3.5 items-center justify-center rounded-full px-0.5 font-mono text-[8px] font-semibold">
            3
          </span>
        </Link>
        <div className="bg-line h-5 w-px" />
        <NavUser user={user} />
      </div>
    </header>
  )
}
