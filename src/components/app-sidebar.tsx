"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BookCheckIcon,
  Building2Icon,
  CommandIcon,
  FileBadge2Icon,
  FileChartColumnIcon,
  FileTextIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
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
      title: "Search",
      url: "/search",
      icon: <SearchIcon />,
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard">
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">DTGSA MDR</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navOperations} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
