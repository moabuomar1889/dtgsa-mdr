import "server-only"
import { prisma } from "@/lib/prisma/client"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

export type PdiImportReport = NonNullable<
  Awaited<ReturnType<typeof getPdiImportReport>>
>

// Reads one stored reconciliation. The run is scoped to a project, so access is
// checked against that project rather than the register as a whole.
export async function getPdiImportReport(
  user: CurrentAppUser,
  runId: string
) {
  const run = await prisma.pdiImportRun.findUnique({
    where: { id: runId },
    include: {
      results: { orderBy: [{ rowNumber: "asc" }] },
    },
  })

  if (!run) {
    return null
  }

  const allowed = hasAnyPermission({
    required: [PERMISSIONS.pdiManage, PERMISSIONS.pdiCollaborate],
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: user.projectRoles
      .filter((item) => item.projectId === run.projectId)
      .map((item) => item.role.code),
  })

  if (!allowed) {
    return null
  }

  return {
    id: run.id,
    fileName: run.fileName,
    createdAt: run.createdAt,
    rowCount: run.rowCount,
    addedCount: run.addedCount,
    numberedCount: run.numberedCount,
    unchangedCount: run.unchangedCount,
    conflictCount: run.conflictCount,
    errorCount: run.errorCount,
    results: run.results,
  }
}
