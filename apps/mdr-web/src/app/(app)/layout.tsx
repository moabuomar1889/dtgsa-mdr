import type { CSSProperties, ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type AppLayoutProps = {
  children: ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const user = await requireCurrentAppUser()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "4.25rem",
        } as CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{
          name: user.fullName,
          email: user.email,
          avatar: "",
        }}
      />
      <SidebarInset className="bg-transparent">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
