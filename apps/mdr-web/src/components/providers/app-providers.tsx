"use client"

import * as React from "react"
import { AppThemeProvider } from "@/components/dtg/theme-provider"
import { Toaster } from "@/components/dtg/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"

type AppProvidersProps = {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppThemeProvider>
      <TooltipProvider delayDuration={150}>
        {children}
        <Toaster closeButton position="bottom-center" />
      </TooltipProvider>
    </AppThemeProvider>
  )
}
