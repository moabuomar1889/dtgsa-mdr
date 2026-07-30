"use client"

import { useLinkStatus } from "next/link"

export function NavigationPendingIndicator() {
  const { pending } = useLinkStatus()

  return (
    <span
      aria-hidden="true"
      data-navigation-pending={pending}
      className={
        pending
          ? "bg-accent ml-auto size-1.5 shrink-0 [animation:nocturne-pulse_0.8s_ease-in-out_100ms_infinite] rounded-full opacity-0"
          : "ml-auto size-1.5 shrink-0 rounded-full opacity-0"
      }
    />
  )
}
