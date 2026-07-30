"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"
import { joinClasses } from "@/components/dtg/classes"
import {
  toggleVariants,
  type ToggleSize,
  type ToggleVariant,
} from "@/components/dtg/toggle"

type ToggleGroupOptions = {
  variant?: ToggleVariant
  size?: ToggleSize
  spacing?: number
  orientation?: "horizontal" | "vertical"
}

const ToggleGroupContext = React.createContext<ToggleGroupOptions>({
  size: "default",
  variant: "default",
  spacing: 0,
  orientation: "horizontal",
})

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  ToggleGroupOptions) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ gap: spacing } as React.CSSProperties}
      className={joinClasses(
        "group/toggle-group flex w-fit flex-row items-center rounded-[8px] data-vertical:flex-col data-vertical:items-stretch",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider
        value={{ variant, size, spacing, orientation }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & {
  variant?: ToggleVariant
  size?: ToggleSize
}) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={toggleVariants({
        variant: context.variant || variant,
        size: context.size || size,
        className: joinClasses("shrink-0", className),
      })}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
