"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NavigationPendingIndicator } from "@/components/navigation-pending-indicator"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/dtg/sidebar"
import { FolderPlusIcon } from "lucide-react"

export function NavMain({
  items,
  canCreateProject,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[]
  canCreateProject: boolean
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="text-dim h-auto px-2 py-1.5 text-[9.5px] font-medium tracking-[0.09em] uppercase">
        Project
      </SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-1">
        {canCreateProject ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Quick Create"
                isActive={pathname === "/projects/new"}
                className="border-accent-line bg-accent-bg text-accent-txt hover:border-accent hover:bg-accent-bg2 h-8 rounded-[7px] border px-2.5 text-[11.5px] font-medium"
              >
                <Link href="/projects/new">
                  <FolderPlusIcon className="size-3.5" />
                  <span>New Project</span>
                  <NavigationPendingIndicator />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={
                  pathname === item.url ||
                  (item.url !== "/dashboard" &&
                    pathname.startsWith(`${item.url}/`))
                }
                className="text-muted hover:bg-accent-bg2 hover:text-text data-[active=true]:bg-accent-bg data-[active=true]:text-text [&_svg]:text-soft data-[active=true]:[&_svg]:text-accent h-8 rounded-[7px] px-2.5 text-[11.5px] data-[active=true]:font-medium data-[active=true]:shadow-[inset_2px_0_0_var(--accent)] [&_svg]:size-3.5"
              >
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                  <NavigationPendingIndicator />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
