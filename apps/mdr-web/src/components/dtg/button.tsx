import * as React from "react"
import { Slot } from "radix-ui"
import { joinClasses } from "@/components/dtg/classes"

type ButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link"
type ButtonSize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg"

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "border-accent bg-[var(--accent)] text-on-accent hover:bg-[var(--accent)] hover:text-on-accent",
  outline: "border-edge bg-raise text-muted hover:bg-accent-bg2",
  secondary: "border-line bg-raise text-text hover:bg-accent-bg2",
  ghost: "border-transparent bg-transparent text-soft hover:bg-accent-bg2",
  destructive: "border-bad/50 bg-bad/10 text-bad hover:bg-bad/15",
  link: "border-transparent bg-transparent px-0 text-accent-txt hover:underline",
}

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-8 gap-1.5 px-3",
  xs: "h-6 gap-1 px-2 text-[10.5px]",
  sm: "h-7 gap-1 px-2.5 text-[11px]",
  lg: "h-9 gap-1.5 px-3.5",
  icon: "size-8",
  "icon-xs": "size-6",
  "icon-sm": "size-7",
  "icon-lg": "size-9",
}

function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant | null
  size?: ButtonSize | null
  className?: string
} = {}) {
  return joinClasses(
    "group/button inline-flex shrink-0 items-center justify-center rounded-[8px] border text-[12px] font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-bad [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
    variantClasses[variant ?? "default"],
    sizeClasses[size ?? "default"],
    className
  )
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-b
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
