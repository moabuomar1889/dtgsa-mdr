import * as React from "react"
import { Slot } from "radix-ui"
import { joinClasses } from "@/components/dtg/classes"

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link"

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-accent-line bg-accent-bg text-accent-txt",
  secondary: "border-line bg-raise text-muted",
  destructive: "border-bad/30 bg-bad/10 text-bad",
  outline: "border-edge bg-transparent text-soft",
  ghost: "border-transparent bg-transparent text-soft",
  link: "border-transparent bg-transparent text-accent-txt hover:underline",
}

function badgeVariants({
  variant = "default",
  className,
}: {
  variant?: BadgeVariant | null
  className?: string
} = {}) {
  return joinClasses(
    "inline-flex min-h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-[4px] border px-1.5 py-0.5 font-mono text-[10.5px] leading-none font-medium whitespace-nowrap [&_svg]:size-3",
    variantClasses[variant ?? "default"],
    className
  )
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & {
  variant?: BadgeVariant
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={badgeVariants({ variant, className })}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
