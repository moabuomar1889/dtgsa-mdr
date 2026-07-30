import * as React from "react"
import { joinClasses } from "@/components/dtg/classes"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={joinClasses(
        "border-edge bg-raise text-text placeholder:text-dim focus-visible:border-accent aria-invalid:border-bad file:text-text h-8 w-full min-w-0 rounded-[8px] border px-2.5 py-1.5 text-[12px] transition-colors file:border-0 file:bg-transparent file:text-[11px] file:font-medium focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        className
      )}
      {...props}
    />
  )
}

export { Input }
