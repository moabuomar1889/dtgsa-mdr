"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PERMISSIONS, type PermissionCode } from "@/lib/permissions/rbac"
import type { ShellOverview } from "@/server/services/shell/shell-overview"
import { NavigationPendingIndicator } from "@/components/navigation-pending-indicator"
import { Sidebar, SidebarContent } from "@/components/dtg/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dtg/dropdown-menu"
import {
  BookCheckIcon,
  Building2Icon,
  FileBadge2Icon,
  FileChartColumnIcon,
  FileCog2Icon,
  FileStackIcon,
  FileTextIcon,
  FolderKanbanIcon,
  HomeIcon,
  InboxIcon,
  ListTodoIcon,
  MessagesSquareIcon,
  MoreHorizontalIcon,
  ReceiptTextIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"

type NavigationItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  requiredPermissions?: readonly PermissionCode[]
  countKey?: keyof ShellOverview["counts"]
  countTone?: "accent" | "bad" | "dim"
}

const primaryNavigation: NavigationItem[] = [
  { title: "Home", url: "/dashboard", icon: HomeIcon },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanbanIcon,
    countKey: "projects",
  },
  {
    title: "Documents",
    url: "/mdr",
    icon: FileTextIcon,
    requiredPermissions: [
      PERMISSIONS.mdrManage,
      PERMISSIONS.workflowPrepare,
      PERMISSIONS.workflowReview,
      PERMISSIONS.workflowApprove,
      PERMISSIONS.dcCheck,
    ],
    countKey: "mdr",
  },
  { title: "Tasks", url: "/tasks", icon: ListTodoIcon, countKey: "tasks" },
]

const moreNavigation: NavigationItem[] = [
  {
    title: "PDI Register",
    url: "/pdi",
    icon: BookCheckIcon,
    requiredPermissions: [PERMISSIONS.pdiManage, PERMISSIONS.pdiCollaborate],
    countKey: "pdi",
  },
  {
    title: "Transmittals",
    url: "/transmittals",
    icon: FileBadge2Icon,
    requiredPermissions: [PERMISSIONS.transmittalsManage],
    countKey: "transmittals",
  },
  {
    title: "Client Replies",
    url: "/replies",
    icon: InboxIcon,
    requiredPermissions: [PERMISSIONS.clientRepliesManage],
    countKey: "replies",
    countTone: "bad",
  },
  {
    title: "PDF Tools",
    url: "/pdf-tools",
    icon: FileStackIcon,
    requiredPermissions: [PERMISSIONS.mdrManage, PERMISSIONS.dcCheck],
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Building2Icon,
    requiredPermissions: [PERMISSIONS.clientsManage],
  },
  {
    title: "Masters",
    url: "/masters",
    icon: FileChartColumnIcon,
    requiredPermissions: [PERMISSIONS.mastersManage],
  },
  {
    title: "Audit",
    url: "/audit",
    icon: ShieldCheckIcon,
    requiredPermissions: [PERMISSIONS.auditView],
  },
  { title: "Search", url: "/search", icon: SearchIcon },
  {
    title: "Templates",
    url: "/templates",
    icon: FileCog2Icon,
    requiredPermissions: [PERMISSIONS.templatesManage],
  },
  { title: "Reports", url: "/reports", icon: ReceiptTextIcon },
  {
    title: "Work Register",
    url: "/work-register",
    icon: MessagesSquareIcon,
    requiredPermissions: [PERMISSIONS.dashboardView],
  },
  {
    title: "Users & Roles",
    url: "/admin/users",
    icon: UsersIcon,
    requiredPermissions: [PERMISSIONS.usersManage, PERMISSIONS.rolesManage],
  },
  {
    title: "Identity Control",
    url: "/admin/identity",
    icon: UsersIcon,
    requiredPermissions: [PERMISSIONS.usersManage, PERMISSIONS.rolesManage],
  },
  { title: "Settings", url: "/settings", icon: Settings2Icon },
]

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  permissions: PermissionCode[]
  overview: ShellOverview
}

export function AppSidebar({
  permissions,
  overview,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname()
  const grantedPermissions = new Set(permissions)
  const canAccess = (item: NavigationItem) =>
    !item.requiredPermissions ||
    item.requiredPermissions.some((permission) =>
      grantedPermissions.has(permission)
    )
  const primaryItems = primaryNavigation.filter(canAccess)
  const moreItems = moreNavigation.filter(canAccess)
  const moreActive = moreItems.some(
    (item) => pathname === item.url || pathname.startsWith(`${item.url}/`)
  )

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent className="bg-panel2 flex min-h-0 flex-1 flex-col px-2 py-3">
        <nav aria-label="Primary navigation" className="space-y-1.5">
          {primaryItems.map((item) => {
            const Icon = item.icon
            const active =
              pathname === item.url ||
              (item.url !== "/dashboard" && pathname.startsWith(`${item.url}/`))
            return (
              <Link
                key={item.title}
                href={item.url}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-12 w-full items-center justify-start gap-3 rounded-[7px] px-3 text-[10px] transition-colors md:h-[66px] md:flex-col md:justify-center md:gap-1.5 md:px-1 ${
                  active
                    ? "bg-accent-bg text-text shadow-[inset_2px_0_0_var(--accent)]"
                    : "text-soft hover:bg-accent-bg2 hover:text-text"
                }`}
              >
                <Icon
                  className={`size-[18px] ${active ? "text-accent-txt" : ""}`}
                />
                <span>{item.title}</span>
                <NavigationPendingIndicator />
              </Link>
            )
          })}
        </nav>

        <div className="mt-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More navigation"
                className={`flex h-12 w-full items-center justify-start gap-3 rounded-[7px] px-3 text-[10px] md:h-[66px] md:flex-col md:justify-center md:gap-1.5 md:px-1 ${
                  moreActive
                    ? "bg-accent-bg text-text shadow-[inset_2px_0_0_var(--accent)]"
                    : "text-soft hover:bg-accent-bg2 hover:text-text"
                }`}
              >
                <MoreHorizontalIcon className="size-[18px]" />
                <span>More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-64">
              <DropdownMenuLabel>Workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {grantedPermissions.has(PERMISSIONS.projectsManage) ? (
                  <DropdownMenuItem asChild>
                    <Link href="/projects/new">
                      <FolderKanbanIcon className="size-3.5" />
                      <span>New project</span>
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {moreItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <DropdownMenuItem key={item.title} asChild>
                      <Link href={item.url} className="flex items-center gap-2">
                        <Icon className="size-3.5" />
                        <span>{item.title}</span>
                        {item.countKey ? (
                          <span className="text-dim ml-auto font-mono text-[9px]">
                            {overview.counts[item.countKey]}
                          </span>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
