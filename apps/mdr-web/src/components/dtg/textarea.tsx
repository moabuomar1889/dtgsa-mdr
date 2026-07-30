import * as React from "react"
import { joinClasses } from "@/components/dtg/classes"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={joinClasses(
        "border-edge bg-raise text-text placeholder:text-dim focus-visible:border-accent aria-invalid:border-bad min-h-24 w-full rounded-[8px] border px-2.5 py-2 text-[12px] transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
