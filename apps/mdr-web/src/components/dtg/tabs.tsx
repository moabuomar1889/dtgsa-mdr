"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { joinClasses } from "@/components/dtg/classes"

type TabsVariant = "default" | "line"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={joinClasses(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

function tabsListVariants({
  variant = "default",
  className,
}: {
  variant?: TabsVariant | null
  className?: string
} = {}) {
  return joinClasses(
    "group/tabs-list inline-flex w-fit items-center justify-center text-soft",
    variant === "line"
      ? "gap-1 border-b border-line bg-transparent"
      : "rounded-[8px] border border-edge bg-raise p-0.5",
    className
  )
}

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: TabsVariant
}) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={tabsListVariants({ variant, className })}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={joinClasses(
        "text-soft hover:text-text data-[state=active]:bg-accent-bg data-[state=active]:text-accent-txt group-data-[variant=line]/tabs-list:data-[state=active]:border-b-accent relative inline-flex min-h-7 flex-1 items-center justify-center gap-1.5 rounded-[6px] border border-transparent px-3 py-1 text-[12px] whitespace-nowrap transition-colors group-data-[variant=line]/tabs-list:rounded-none disabled:pointer-events-none disabled:opacity-45 data-[state=active]:font-medium group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={joinClasses("flex-1 text-[12px] outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
