import type { CSSProperties, ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/dtg/sidebar"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type AppLayoutProps = {
  children: ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const user = await requireCurrentAppUser()
  const shellUser = {
    name: user.fullName,
    email: user.email,
    avatar: "",
  }
  const canViewTransmittals = hasAnyPermission({
    required: PERMISSIONS.transmittalsManage,
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: user.projectRoles.map((item) => item.role.code),
  })

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
        <SiteHeader user={shellUser} />
        <div className="flex min-h-0 flex-1">
          <AppSidebar
            className="border-line top-[50px] bottom-0 h-auto border-r"
            user={shellUser}
            canViewTransmittals={canViewTransmittals}
          />
          <SidebarInset className="bg-bg min-h-0 overflow-y-auto">
            <div className="flex min-h-full flex-col">{children}</div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}
