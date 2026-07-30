"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "radix-ui"
import { joinClasses } from "@/components/dtg/classes"

export type ToggleVariant = "default" | "outline"
export type ToggleSize = "default" | "sm" | "lg"

function toggleVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ToggleVariant | null
  size?: ToggleSize | null
  className?: string
} = {}) {
  return joinClasses(
    "inline-flex items-center justify-center gap-1 rounded-[7px] text-[11.5px] font-medium whitespace-nowrap text-soft transition-colors hover:bg-accent-bg2 hover:text-text disabled:pointer-events-none disabled:opacity-45 data-[state=on]:bg-accent-bg data-[state=on]:text-accent-txt [&_svg]:size-3.5",
    variant === "outline" && "border border-edge bg-raise",
    size === "sm"
      ? "h-7 min-w-7 px-2"
      : size === "lg"
        ? "h-9 min-w-9 px-3"
        : "h-8 min-w-8 px-2.5",
    className
  )
}

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & {
  variant?: ToggleVariant
  size?: ToggleSize
}) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={toggleVariants({ variant, size, className })}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
