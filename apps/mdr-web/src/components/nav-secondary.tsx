"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/dtg/sidebar"

export function NavSecondary({
  items,
  label,
  ...props
}: {
  label?: string
  items: {
    title: string
    url: string
    icon: React.ReactNode
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="border-line mt-2 border-t px-0 pt-2" {...props}>
      {label ? (
        <SidebarGroupLabel className="text-dim h-auto px-2 py-1.5 text-[9.5px] font-medium tracking-[0.09em] uppercase">
          {label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname === item.url ||
                  (item.url !== "/dashboard" &&
                    pathname.startsWith(`${item.url}/`))
                }
                className="text-muted hover:bg-accent-bg2 hover:text-text data-[active=true]:bg-accent-bg data-[active=true]:text-text [&_svg]:text-soft data-[active=true]:[&_svg]:text-accent h-8 rounded-[7px] px-2.5 text-[11.5px] data-[active=true]:font-medium data-[active=true]:shadow-[inset_2px_0_0_var(--accent)] [&_svg]:size-3.5"
              >
                <a href={item.url}>
                  {item.icon}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
