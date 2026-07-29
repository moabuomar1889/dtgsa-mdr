"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="text-dim h-auto px-2 py-1.5 text-[9.5px] font-medium tracking-[0.09em] uppercase">
        Project
      </SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-1">
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
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                className="text-muted data-active:bg-accent-bg data-active:text-text hover:bg-accent-bg2 hover:text-text [&_svg]:text-soft data-active:[&_svg]:text-accent h-8 rounded-[7px] px-2.5 text-[11.5px] data-active:font-medium data-active:shadow-[inset_2px_0_0_var(--accent)] [&_svg]:size-3.5"
              >
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
