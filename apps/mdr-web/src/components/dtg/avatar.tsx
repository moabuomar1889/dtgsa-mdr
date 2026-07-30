"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"
import { joinClasses } from "@/components/dtg/classes"

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={joinClasses(
        "group/avatar border-line relative flex size-[23px] shrink-0 overflow-hidden rounded-full border select-none data-[size=lg]:size-8 data-[size=sm]:size-5",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={joinClasses(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={joinClasses(
        "bg-accent-bg text-accent-txt flex size-full items-center justify-center rounded-full text-[9.5px] font-semibold",
        className
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={joinClasses(
        "border-panel text-on-accent absolute right-0 bottom-0 z-10 inline-flex size-2.5 items-center justify-center rounded-full border bg-[var(--accent)]",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={joinClasses("group/avatar-group flex -space-x-1.5", className)}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={joinClasses(
        "border-line bg-raise text-soft flex size-[23px] shrink-0 items-center justify-center rounded-full border font-mono text-[9px]",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
