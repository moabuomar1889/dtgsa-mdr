"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"
import { joinClasses } from "@/components/dtg/classes"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={joinClasses(
        "text-dim flex items-center gap-2 text-[11px] leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-45",
        className
      )}
      {...props}
    />
  )
}

export { Label }
