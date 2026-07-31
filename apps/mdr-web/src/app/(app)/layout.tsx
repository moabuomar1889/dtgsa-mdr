import { Suspense, type CSSProperties, type ReactNode } from "react"
import {
  AppShellHeader,
  AppShellHeaderFallback,
  AppShellSidebar,
  AppShellSidebarFallback,
} from "@/components/app/app-shell"
import { SidebarInset, SidebarProvider } from "@/components/dtg/sidebar"

type AppLayoutProps = {
  children: ReactNode
}

// This layout deliberately performs no runtime data access of its own. Reading
// the session here makes every client transition block on the layout render,
// and `loading.tsx` never gets to show a fallback. The session is read inside
// the Suspense-wrapped shell slots instead; unauthenticated requests are
// already redirected by `proxy.ts` before they reach this point, and each page
// still enforces its own server-side authorization.
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider
      className="bg-bg block min-h-0"
      style={
        {
          "--sidebar-width": "208px",
          "--header-height": "50px",
        } as CSSProperties
      }
    >
      <div className="flex h-svh min-h-0 w-full flex-col overflow-hidden">
        <Suspense fallback={<AppShellHeaderFallback />}>
          <AppShellHeader />
        </Suspense>
        <div className="flex min-h-0 flex-1">
          <Suspense fallback={<AppShellSidebarFallback />}>
            <AppShellSidebar className="border-line top-[50px] bottom-0 h-auto border-r" />
          </Suspense>
          <SidebarInset className="bg-bg min-h-0 overflow-y-auto">
            <div className="flex min-h-full flex-col">{children}</div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}
