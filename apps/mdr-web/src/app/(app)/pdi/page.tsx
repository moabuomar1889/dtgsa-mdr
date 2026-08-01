import Link from "next/link"
import { hasAnyPermission, PERMISSIONS } from "@/lib/permissions/rbac"
import { createPdiItemAction } from "@/server/actions/pdi"
import { importPdiWorkbookAction } from "@/server/actions/pdi-import"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { PdiImportReport } from "@/components/app/pdi-import-report"
import { getPdiImportReport } from "@/server/services/pdi/pdi-import-report"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import {
  getPdiOverview,
  PDI_REGISTER_PERMISSIONS,
} from "@/server/services/pdi/pdi-service"
import { PdiItemForm } from "@/components/app/pdi-item-form"
import { Button } from "@/components/dtg/button"
import { PdiBulkTools } from "@/features/pdi/components/pdi-bulk-tools"
import { PdiRegister } from "@/features/pdi/components/pdi-register"
import { PdiWorkspace } from "@/features/pdi/components/pdi-workspace"

export const dynamic = "force-dynamic"

export default async function PdiPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string | string[]
    import?: string | string[]
  }>
}) {
  const user = await requireCurrentAppUser()
  requireUserHasAnyPermission(user, PDI_REGISTER_PERMISSIONS)

  const filters = (await searchParams) ?? {}
  const pageValue = Array.isArray(filters.page) ? filters.page[0] : filters.page
  const importRunId = Array.isArray(filters.import)
    ? filters.import[0]
    : filters.import
  const page = Number(pageValue ?? "1")
  const [overview, importReport] = await Promise.all([
    getPdiOverview(user, page),
    importRunId
      ? getPdiImportReport(user, importRunId)
      : Promise.resolve(null),
  ])

  const systemRoles = user.userRoles.map((entry) => entry.role.code)
  const projectRolesByProject = new Map(
    overview.projects.map((project) => [
      project.id,
      user.projectRoles
        .filter((entry) => entry.projectId === project.id)
        .map((entry) => entry.role.code),
    ])
  )
  const projectHasPermission = (
    projectId: string,
    permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
  ) =>
    hasAnyPermission({
      required: permission,
      systemRoles,
      projectRoles: projectRolesByProject.get(projectId) ?? [],
    })

  const manageableProjectIds = overview.projects
    .filter((project) =>
      projectHasPermission(project.id, PERMISSIONS.pdiManage)
    )
    .map((project) => project.id)
  const collaborativeProjectIds = overview.projects
    .filter((project) =>
      projectHasPermission(project.id, PERMISSIONS.pdiCollaborate)
    )
    .map((project) => project.id)
  const manageableProjects = overview.projects.filter((project) =>
    manageableProjectIds.includes(project.id)
  )
  const transferProjects = overview.projects.filter(
    (project) =>
      manageableProjectIds.includes(project.id) ||
      collaborativeProjectIds.includes(project.id)
  )

  return (
    <PdiWorkspace
      counts={overview.counts}
      canCreate={manageableProjects.length > 0}
      canTransfer={transferProjects.length > 0}
      createPanel={
        manageableProjects.length > 0 ? (
          <PdiItemForm
            projects={manageableProjects.map((project) => ({
              id: project.id,
              code: project.code,
              name: project.name,
              clientCode: project.client.code,
              clientName: project.client.name,
            }))}
            disciplines={overview.disciplines}
            documentTypes={overview.documentTypes}
            releasePurposes={overview.releasePurposes}
            action={createPdiItemAction}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-soft text-[11px] leading-5">
              A manageable project is required before a PDI line can be created.
            </p>
            <Button asChild>
              <Link href="/projects/new">Create project</Link>
            </Button>
          </div>
        )
      }
      transferPanel={
        <PdiBulkTools
          projects={transferProjects}
          importAction={importPdiWorkbookAction}
        />
      }
    >
      {importReport ? <PdiImportReport report={importReport} /> : null}
      <PdiRegister
        overview={overview}
        manageableProjectIds={manageableProjectIds}
        collaborativeProjectIds={collaborativeProjectIds}
      />
    </PdiWorkspace>
  )
}
