import "server-only"
import * as XLSX from "xlsx"
import { PdiStatus, ScopeLevel } from "@prisma/client"
import { z } from "zod"
import { PERMISSIONS, ROLE_CODES, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { createPdiItem, updatePdiClientDocumentNumber } from "@/server/services/pdi/pdi-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const importWorkbookSchema = z.object({
  projectId: z.string().trim().min(1),
})

const updatePortalClientNumberSchema = z.object({
  pdiItemId: z.string().trim().min(1),
  clientDocumentNumber: z.string().trim().min(1).max(120),
})

const GLOBAL_SCOPE_KEY = "system"

function canManagePdi(user: CurrentAppUser, projectId?: string) {
  return hasAnyPermission({
    required: [PERMISSIONS.pdiManage, PERMISSIONS.pdiCollaborate],
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: projectId
      ? user.projectRoles
          .filter((item) => item.projectId === projectId)
          .map((item) => item.role.code)
      : user.projectRoles.map((item) => item.role.code),
  })
}

function normalizeCell(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim()
}

export async function exportPdiWorkbook(input: {
  user: CurrentAppUser
  projectId?: string | null
}) {
  if (input.projectId && !canManagePdi(input.user, input.projectId)) {
    throw new Error("You do not have permission to export this PDI register.")
  }

  const where =
    input.projectId
      ? {
          deletedAt: null,
          projectId: input.projectId,
        }
      : {
          deletedAt: null,
        }

  const items = await prisma.pdiItem.findMany({
    where,
    orderBy: [{ createdAt: "asc" }],
    include: {
      project: {
        select: {
          code: true,
          name: true,
          client: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
      discipline: {
        select: {
          code: true,
          name: true,
        },
      },
      documentTypeCategory: {
        select: {
          code: true,
          name: true,
        },
      },
      releasePurpose: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  })

  const rows = items.map((item) => ({
    ProjectCode: item.project.code,
    ProjectName: item.project.name,
    ClientCode: item.project.client.code,
    DtgsaDocumentNumber: item.dtgsaDocumentNumber,
    ClientDocumentNumber: item.clientDocumentNumber ?? "",
    DisciplineCode: item.discipline.code,
    DisciplineName: item.discipline.name,
    DocumentTypeCode: item.documentTypeCategory?.code ?? "",
    ReleasePurposeCode: item.releasePurpose?.code ?? "",
    Title: item.title,
    Revision: item.revision,
    Status: item.status,
    Tags: item.tags.join(", "),
    Remarks: item.remarks ?? "",
  }))

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, worksheet, "PDI")

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  })
}

export async function importPdiWorkbook(
  user: CurrentAppUser,
  input: {
    projectId: unknown
    file: unknown
  }
) {
  const parsed = importWorkbookSchema.parse({
    projectId: input.projectId,
  })

  if (!canManagePdi(user, parsed.projectId)) {
    throw new Error("You do not have permission to import into this PDI register.")
  }

  const file = input.file instanceof File ? input.file : null

  if (!file || file.size === 0) {
    throw new Error("An Excel workbook is required.")
  }

  const project = await prisma.project.findUnique({
    where: {
      id: parsed.projectId,
    },
    include: {
      client: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!project || project.deletedAt) {
    throw new Error("The selected project could not be found.")
  }

  const [disciplines, documentTypes, releasePurposes] = await Promise.all([
    prisma.discipline.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
    }),
    prisma.documentTypeCategory.findMany({
      where: {
        isActive: true,
        OR: [
          {
            projectId: project.id,
          },
          {
            clientId: project.clientId,
            projectId: null,
          },
          {
            scopeLevel: ScopeLevel.Global,
            scopeKey: GLOBAL_SCOPE_KEY,
          },
        ],
      },
    }),
    prisma.releasePurpose.findMany({
      where: {
        isActive: true,
        OR: [
          {
            projectId: project.id,
          },
          {
            clientId: project.clientId,
            projectId: null,
          },
          {
            scopeLevel: ScopeLevel.Global,
            scopeKey: GLOBAL_SCOPE_KEY,
          },
        ],
      },
    }),
  ])

  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
  })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]

  if (!worksheet) {
    throw new Error("The workbook does not contain a readable worksheet.")
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  })

  let importedCount = 0

  for (const row of rows) {
    const title = normalizeCell(row.Title)

    if (!title) {
      continue
    }

    const discipline = disciplines.find(
      (item) => item.code === normalizeCell(row.DisciplineCode).toUpperCase()
    )
    const documentType = documentTypes.find(
      (item) => item.code === normalizeCell(row.DocumentTypeCode).toUpperCase()
    )
    const releasePurpose = releasePurposes.find(
      (item) => item.code === normalizeCell(row.ReleasePurposeCode).toUpperCase()
    )

    if (!discipline || !documentType || !releasePurpose) {
      throw new Error(
        `Import failed for "${title}" because one or more coding-table values were not found.`
      )
    }

    const created = await createPdiItem({
      projectId: project.id,
      disciplineId: discipline.id,
      documentTypeCategoryId: documentType.id,
      releasePurposeId: releasePurpose.id,
      title,
      revision: normalizeCell(row.Revision) || "00",
      remarks: normalizeCell(row.Remarks) || undefined,
      tags: normalizeCell(row.Tags) || undefined,
      createdByUserId: user.id,
    })

    const clientDocumentNumber = normalizeCell(row.ClientDocumentNumber)

    if (clientDocumentNumber) {
      await updatePdiClientDocumentNumber({
        pdiItemId: created.id,
        clientDocumentNumber,
      })
    }

    importedCount += 1
  }

  return {
    importedCount,
  }
}

export async function getPortalPdiOverview(user: CurrentAppUser) {
  const isSystemClientDc = user.userRoles.some(
    (item) => item.role.code === ROLE_CODES.clientDocumentControlUser
  )

  const allowedProjectIds = isSystemClientDc
    ? null
    : user.projectRoles
        .filter((item) => item.role.code === ROLE_CODES.clientDocumentControlUser)
        .map((item) => item.projectId)

  if (!isSystemClientDc && allowedProjectIds !== null && allowedProjectIds.length === 0) {
    throw new Error("You do not have access to the client portal.")
  }

  const items = await prisma.pdiItem.findMany({
    where: {
      deletedAt: null,
      ...(allowedProjectIds !== null
        ? {
            projectId: {
              in: allowedProjectIds,
            },
          }
        : {}),
      status: {
        in: [
          PdiStatus.SentToClient,
          PdiStatus.ClientNumberPending,
          PdiStatus.ClientNumberReceived,
        ],
      },
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
          client: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
      discipline: {
        select: {
          code: true,
          name: true,
        },
      },
      documentTypeCategory: {
        select: {
          code: true,
          name: true,
        },
      },
      releasePurpose: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  })

  return {
    items,
    projects: Array.from(
      new Map(items.map((item) => [item.project.id, item.project])).values()
    ),
  }
}

export async function updatePortalPdiClientDocumentNumber(
  user: CurrentAppUser,
  input: {
    pdiItemId: unknown
    clientDocumentNumber: unknown
  }
) {
  const parsed = updatePortalClientNumberSchema.parse(input)

  const item = await prisma.pdiItem.findUnique({
    where: {
      id: parsed.pdiItemId,
    },
    select: {
      id: true,
      projectId: true,
      deletedAt: true,
    },
  })

  if (!item || item.deletedAt) {
    throw new Error("The selected PDI item could not be found.")
  }

  const canAccessProject = hasAnyPermission({
    required: [PERMISSIONS.pdiCollaborate],
    systemRoles: user.userRoles.map((entry) => entry.role.code),
    projectRoles: user.projectRoles
      .filter((entry) => entry.projectId === item.projectId)
      .map((entry) => entry.role.code),
  })

  if (!canAccessProject) {
    throw new Error("You do not have access to update this PDI item in the portal.")
  }

  return updatePdiClientDocumentNumber(parsed)
}
