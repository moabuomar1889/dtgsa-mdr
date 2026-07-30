"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { PERMISSIONS, type PermissionCode } from "@/lib/permissions/rbac"
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
    },
    {
      title: "PDI Register",
      url: "/pdi",
      icon: <BookCheckIcon />,
      requiredPermissions: [PERMISSIONS.pdiManage, PERMISSIONS.pdiCollaborate],
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
    },
    {
      title: "Transmittals",
      url: "/transmittals",
      icon: <FileBadge2Icon />,
      requiredPermissions: [PERMISSIONS.transmittalsManage],
    },
    {
      title: "Client Replies",
      url: "/replies",
      icon: <InboxIcon />,
      requiredPermissions: [PERMISSIONS.clientRepliesManage],
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

type SidebarUser = {
  name: string
  email: string
  avatar: string
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: SidebarUser
  permissions: PermissionCode[]
}

export function AppSidebar({ user, permissions, ...props }: AppSidebarProps) {
  const grantedPermissions = new Set(permissions)
  const canAccess = (item: NavigationItem) =>
    !item.requiredPermissions ||
    item.requiredPermissions.some((permission) =>
      grantedPermissions.has(permission)
    )
  const navMain = data.navMain.filter(canAccess)
  const navOperations = data.navOperations.filter(canAccess)
  const navSecondary = data.navSecondary.filter(canAccess)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent className="bg-panel2 gap-0 px-2.5 py-3">
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
      <SidebarFooter className="border-line bg-panel2 border-t p-2.5">
        <div
          aria-label={`${user.name} workspace progress`}
          className="border-line bg-raise rounded-[8px] border p-2.5"
        >
          <p className="text-dim text-[9.5px] tracking-[0.09em] uppercase">
            Workspace
          </p>
          <p className="text-muted mt-1 truncate text-[11px] font-medium">
            Operational readiness
          </p>
          <p className="text-dim mt-0.5 truncate font-mono text-[9.5px]">
            68% configured
          </p>
          <div className="bg-track mt-2 h-1 overflow-hidden rounded-[2px]">
            <div className="h-full w-[68%] bg-[var(--accent)]" />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
