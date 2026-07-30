"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { CheckIcon } from "lucide-react"
import { joinClasses } from "@/components/dtg/classes"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={joinClasses(
        "border-edge bg-raise text-on-accent aria-invalid:border-bad data-checked:border-accent relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors after:absolute after:-inset-2 disabled:cursor-not-allowed disabled:opacity-45 data-checked:bg-[var(--accent)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center [&>svg]:size-3"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
