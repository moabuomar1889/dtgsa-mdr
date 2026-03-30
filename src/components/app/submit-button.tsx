"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

type SubmitButtonProps = {
  label: string
  pendingLabel?: string
  className?: string
}

export function SubmitButton({
  label,
  pendingLabel,
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel ?? `${label}...` : label}
    </Button>
  )
}
