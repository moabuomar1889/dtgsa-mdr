"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/components/dtg/theme-provider"

export function Toaster(props: ToasterProps) {
  const { mode } = useTheme()

  return (
    <Sonner
      theme={mode}
      icons={{
        success: <CircleCheckIcon className="size-3.5" />,
        info: <InfoIcon className="size-3.5" />,
        warning: <TriangleAlertIcon className="size-3.5" />,
        error: <OctagonXIcon className="size-3.5" />,
        loading: <Loader2Icon className="size-3.5 animate-spin" />,
      }}
      toastOptions={{
        style: {
          background: "var(--sel)",
          border: "1px solid var(--accent-line)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow)",
          color: "var(--text)",
          fontSize: "12px",
        },
      }}
      {...props}
    />
  )
}
