"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { PERMISSIONS, type PermissionCode } from "@/lib/permissions/rbac"
import type { ShellOverview } from "@/server/services/shell/shell-overview"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/dtg/sidebar"
import {
  BookCheckIcon,
  Building2Icon,
  FileBadge2Icon,
  FileChartColumnIcon,
  FileCog2Icon,
  FileStackIcon,
  FileTextIcon,
  FolderKanbanIcon,
  InboxIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  MessagesSquareIcon,
  ReceiptTextIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"

type NavigationItem = {
  title: string
  url: string
  icon: React.ReactNode
  requiredPermissions?: readonly PermissionCode[]
  countKey?: keyof ShellOverview["counts"]
  countTone?: "accent" | "bad" | "dim"
}

const data: {
  navMain: NavigationItem[]
  navSecondary: NavigationItem[]
  navOperations: NavigationItem[]
} = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: <FolderKanbanIcon />,
      countKey: "projects",
    },
    {
      title: "PDI Register",
      url: "/pdi",
      icon: <BookCheckIcon />,
      requiredPermissions: [PERMISSIONS.pdiManage, PERMISSIONS.pdiCollaborate],
      countKey: "pdi",
    },
    {
      title: "MDR",
      url: "/mdr",
      icon: <FileTextIcon />,
      requiredPermissions: [
        PERMISSIONS.mdrManage,
        PERMISSIONS.workflowPrepare,
        PERMISSIONS.workflowReview,
        PERMISSIONS.workflowApprove,
        PERMISSIONS.dcCheck,
      ],
      countKey: "mdr",
    },
    {
      title: "Transmittals",
      url: "/transmittals",
      icon: <FileBadge2Icon />,
      requiredPermissions: [PERMISSIONS.transmittalsManage],
      countKey: "transmittals",
    },
    {
      title: "Client Replies",
      url: "/replies",
      icon: <InboxIcon />,
      requiredPermissions: [PERMISSIONS.clientRepliesManage],
      countKey: "replies",
      countTone: "bad",
    },
    {
      title: "PDF Tools",
      url: "/pdf-tools",
      icon: <FileStackIcon />,
      requiredPermissions: [PERMISSIONS.mdrManage, PERMISSIONS.dcCheck],
    },
    {
      title: "Tasks",
      url: "/tasks",
      icon: <ListTodoIcon />,
      countKey: "tasks",
      countTone: "accent",
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: <Settings2Icon />,
    },
    {
      title: "Users & Roles",
      url: "/admin/users",
      icon: <UsersIcon />,
      requiredPermissions: [PERMISSIONS.usersManage, PERMISSIONS.rolesManage],
    },
    {
      title: "Identity Control",
      url: "/admin/identity",
      icon: <UsersIcon />,
      requiredPermissions: [PERMISSIONS.usersManage, PERMISSIONS.rolesManage],
    },
    {
      title: "Search",
      url: "/search",
      icon: <SearchIcon />,
    },
    {
      title: "Templates",
      url: "/templates",
      icon: <FileCog2Icon />,
      requiredPermissions: [PERMISSIONS.templatesManage],
    },
    {
      title: "Reports",
      url: "/reports",
      icon: <ReceiptTextIcon />,
    },
    {
      title: "Work Register",
      url: "/work-register",
      icon: <MessagesSquareIcon />,
      requiredPermissions: [PERMISSIONS.dashboardView],
    },
  ],
  navOperations: [
    {
      title: "Clients",
      url: "/clients",
      icon: <Building2Icon />,
      requiredPermissions: [PERMISSIONS.clientsManage],
    },
    {
      title: "Masters",
      url: "/masters",
      icon: <FileChartColumnIcon />,
      requiredPermissions: [PERMISSIONS.mastersManage],
    },
    {
      title: "Audit",
      url: "/audit",
      icon: <ShieldCheckIcon />,
      requiredPermissions: [PERMISSIONS.auditView],
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  permissions: PermissionCode[]
  overview: ShellOverview
}

export function AppSidebar({
  permissions,
  overview,
  ...props
}: AppSidebarProps) {
  const grantedPermissions = new Set(permissions)
  const canAccess = (item: NavigationItem) =>
    !item.requiredPermissions ||
    item.requiredPermissions.some((permission) =>
      grantedPermissions.has(permission)
    )
  const withCount = (item: NavigationItem) => ({
    ...item,
    count: item.countKey ? overview.counts[item.countKey] : undefined,
    countTone: item.countTone,
  })
  const navMain = data.navMain.filter(canAccess).map(withCount)
  const navOperations = data.navOperations.filter(canAccess).map(withCount)
  const navSecondary = data.navSecondary.filter(canAccess).map(withCount)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent className="bg-panel2 min-h-0 flex-1 gap-0 overflow-y-auto px-2.5 py-3">
        <NavMain
          items={navMain}
          canCreateProject={grantedPermissions.has(PERMISSIONS.projectsManage)}
        />
        {navOperations.length > 0 ? (
          <NavSecondary label="Operations" items={navOperations} />
        ) : null}
        {navSecondary.length > 0 ? (
          <NavSecondary label="Platform" items={navSecondary} />
        ) : null}
      </SidebarContent>
      {/* Design §4: bottom-pinned progress card. Real submission progress —
          current revisions already issued to the client. */}
      <SidebarFooter className="border-line bg-panel2 border-t p-2.5">
        <div className="border-line bg-raise rounded-[8px] border p-[9px]">
          <p className="text-dim mb-1 text-[10px]">Submission progress</p>
          <p className="flex items-baseline gap-[5px]">
            <span className="font-mono text-[19px] font-semibold tracking-[-0.02em]">
              {overview.submission.percent}
            </span>
            <span className="text-soft text-[11px]">
              % of {overview.submission.totalCount} docs
            </span>
          </p>
          <div className="bg-track mt-[7px] h-1 overflow-hidden rounded-[2px]">
            <div
              className="h-full bg-[var(--accent)]"
              style={{ width: `${overview.submission.percent}%` }}
            />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
