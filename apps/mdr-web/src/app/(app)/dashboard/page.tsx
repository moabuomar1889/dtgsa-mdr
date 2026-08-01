import { CommandWorkspace } from "@/features/dashboard/components/command-workspace"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getCommandWorkspaceOverview } from "@/server/services/dashboard/command-workspace-service"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] }>
}) {
  const user = await requireCurrentAppUser()
  const filters = await searchParams
  const requestedProjectId = Array.isArray(filters.project)
    ? filters.project[0]
    : filters.project
  const overview = await getCommandWorkspaceOverview(user, requestedProjectId)

  return <CommandWorkspace overview={overview} />
}
