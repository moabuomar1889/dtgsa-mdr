"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
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

const data = {
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
    },
    {
      title: "MDR",
      url: "/mdr",
      icon: <FileTextIcon />,
    },
    {
      title: "Transmittals",
      url: "/transmittals",
      icon: <FileBadge2Icon />,
    },
    {
      title: "Client Replies",
      url: "/replies",
      icon: <InboxIcon />,
    },
    {
      title: "PDF Tools",
      url: "/pdf-tools",
      icon: <FileStackIcon />,
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
    },
    {
      title: "Identity Control",
      url: "/admin/identity",
      icon: <UsersIcon />,
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
    },
    {
      title: "Masters",
      url: "/masters",
      icon: <FileChartColumnIcon />,
    },
    {
      title: "Audit",
      url: "/audit",
      icon: <ShieldCheckIcon />,
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
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent className="bg-panel2 gap-0 px-2.5 py-3">
        <NavMain items={data.navMain} />
        <NavSecondary label="Operations" items={data.navOperations} />
        <NavSecondary label="Platform" items={data.navSecondary} />
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
