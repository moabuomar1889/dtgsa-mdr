"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  const pathname = usePathname()
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
    "/search": "Search",
    "/tasks": "Task Dashboard",
    "/templates": "Templates",
    "/reports": "Reporting",
    "/clients": "Clients",
    "/masters": "Masters",
    "/profile": "Account",
    "/notifications": "Notifications",
  }

  const title = titleMap[pathname] ?? "DTGSA Document Control"

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 backdrop-blur-xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <div className="space-y-0.5">
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            <p className="hidden text-xs text-muted-foreground md:block">
              Enterprise workflow, numbering, revisions, transmittals, and audit
              control.
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
