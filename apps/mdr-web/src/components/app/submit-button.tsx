"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

type SubmitButtonProps = {
  label: string
  pendingLabel?: string
  className?: string
  disabled?: boolean
}

export function SubmitButton({
  label,
  pendingLabel,
  className,
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className={className} disabled={pending || disabled}>
      {pending ? pendingLabel ?? `${label}...` : label}
    </Button>
  )
}
