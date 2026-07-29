"use client"

import { useFormStatus } from "react-dom"
import type { ComponentProps } from "react"
import { Button } from "@/components/dtg/button"

type SubmitButtonProps = {
  label: string
  pendingLabel?: string
  className?: string
  disabled?: boolean
} & Pick<ComponentProps<typeof Button>, "variant" | "size">

export function SubmitButton({
  label,
  pendingLabel,
  className,
  disabled = false,
  variant,
  size,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className={className}
      disabled={pending || disabled}
      variant={variant}
      size={size}
    >
      {pending ? (pendingLabel ?? `${label}...`) : label}
    </Button>
  )
}
