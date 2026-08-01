import "server-only"
import { PdiStatus, ScopeLevel } from "@prisma/client"
import { z } from "zod"
import {
  PERMISSIONS,
  ROLE_CODES,
  hasAnyPermission,
} from "@/lib/permissions/rbac"
import {
  normalizePdiImportRow,
  normalizePdiTitleKey,
  readPdiWorkbookRows,
  writePdiWorkbook,
} from "@/lib/pdi/excel"
import { prisma } from "@/lib/prisma/client"
import { createHash } from "node:crypto"
import {
  createPdiItem,
  updatePdiClientDocumentNumber,
} from "@/server/services/pdi/pdi-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import {
  assertExternalPortalScope,
  type requireExternalPortalSession,
} from "@/server/services/identity/external-portal-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>
type ExternalPortalSession = Awaited<
  ReturnType<typeof requireExternalPortalSession>
>

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

export async function exportPdiWorkbook(input: {
  user: CurrentAppUser
  projectId?: string | null
}) {
  if (input.projectId && !canManagePdi(input.user, input.projectId)) {
    throw new Error("You do not have permission to export this PDI register.")
  }

  const where = input.projectId
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

  return await writePdiWorkbook(rows)
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
    throw new Error(
      "You do not have permission to import into this PDI register."
    )
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

  const fileBytes = Buffer.from(await file.arrayBuffer())
  const rows = await readPdiWorkbookRows(fileBytes)

  // The register is reconciled against the workbook. A row matches on the
  // internal number AND the title, per the recorded owner decision. A row whose
  // internal number already exists but whose title differs is never re-created,
  // because that would mint a second internal number for the same document; it
  // is reported as a conflict for a person to resolve.
  const register = await prisma.pdiRegister.upsert({
    where: { projectId: project.id },
    create: { projectId: project.id },
    update: {},
    select: { id: true },
  })

  const existingItems = await prisma.pdiItem.findMany({
    where: { projectId: project.id, deletedAt: null },
    select: {
      id: true,
      dtgsaDocumentNumber: true,
      clientDocumentNumber: true,
      title: true,
    },
  })
  const byNumber = new Map(
    existingItems.map((item) => [item.dtgsaDocumentNumber, item])
  )

  type RowOutcome =
    | "Added"
    | "ClientNumberAssigned"
    | "Unchanged"
    | "Conflict"
    | "Error"
  type RowResult = {
    rowNumber: number
    outcome: RowOutcome
    dtgsaDocumentNumber?: string | null
    clientDocumentNumber?: string | null
    title?: string | null
    detail?: string | null
    pdiItemId?: string | null
  }
  const results: RowResult[] = []

  for (const [index, row] of rows.entries()) {
    // Row 1 is the header in the exported workbook.
    const rowNumber = index + 2
    const normalizedRow = normalizePdiImportRow(row)
    const title = normalizedRow.title
    const internalNumber = normalizedRow.dtgsaDocumentNumber
    const clientNumber = normalizedRow.clientDocumentNumber ?? null

    if (!title) {
      continue
    }

    const existing = internalNumber ? byNumber.get(internalNumber) : undefined

    if (internalNumber && !existing) {
      results.push({
        rowNumber,
        outcome: "Conflict",
        dtgsaDocumentNumber: internalNumber,
        title,
        detail:
          "The internal number in this row does not exist in the register for this project.",
      })
      continue
    }

    if (existing) {
      if (normalizePdiTitleKey(existing.title) !== normalizePdiTitleKey(title)) {
        results.push({
          rowNumber,
          outcome: "Conflict",
          dtgsaDocumentNumber: internalNumber,
          clientDocumentNumber: clientNumber,
          title,
          pdiItemId: existing.id,
          detail:
            'The title does not match the register, which holds "' +
            existing.title +
            '". Change the title from the register if the client agreed to it.',
        })
        continue
      }

      if (!clientNumber) {
        results.push({
          rowNumber,
          outcome: "Unchanged",
          dtgsaDocumentNumber: internalNumber,
          title,
          pdiItemId: existing.id,
          detail: "No client number supplied in this row.",
        })
        continue
      }

      if (existing.clientDocumentNumber) {
        const same = existing.clientDocumentNumber === clientNumber
        results.push({
          rowNumber,
          outcome: same ? "Unchanged" : "Conflict",
          dtgsaDocumentNumber: internalNumber,
          clientDocumentNumber: clientNumber,
          title,
          pdiItemId: existing.id,
          detail: same
            ? "Client number already recorded and identical."
            : "A different client number is already recorded (" +
              existing.clientDocumentNumber +
              "). Client numbers are immutable once set.",
        })
        continue
      }

      try {
        await updatePdiClientDocumentNumber({
          pdiItemId: existing.id,
          clientDocumentNumber: clientNumber,
        })
        results.push({
          rowNumber,
          outcome: "ClientNumberAssigned",
          dtgsaDocumentNumber: internalNumber,
          clientDocumentNumber: clientNumber,
          title,
          pdiItemId: existing.id,
        })
      } catch (error) {
        results.push({
          rowNumber,
          outcome: "Error",
          dtgsaDocumentNumber: internalNumber,
          clientDocumentNumber: clientNumber,
          title,
          pdiItemId: existing.id,
          detail:
            error instanceof Error ? error.message : "Unknown import failure.",
        })
      }
      continue
    }

    // No internal number in the row: a genuinely new line the client added.
    const discipline = disciplines.find(
      (item) => item.code === normalizedRow.disciplineCode
    )
    const documentType = documentTypes.find(
      (item) => item.code === normalizedRow.documentTypeCode
    )
    const releasePurpose = releasePurposes.find(
      (item) => item.code === normalizedRow.releasePurposeCode
    )

    if (!discipline || !documentType || !releasePurpose) {
      results.push({
        rowNumber,
        outcome: "Error",
        title,
        detail:
          "One or more coding-table values in this row were not found for this project.",
      })
      continue
    }

    try {
      const created = await createPdiItem({
        projectId: project.id,
        disciplineId: discipline.id,
        documentTypeCategoryId: documentType.id,
        releasePurposeId: releasePurpose.id,
        title,
        revision: normalizedRow.revision,
        remarks: normalizedRow.remarks,
        tags: normalizedRow.tags,
        createdByUserId: user.id,
      })
      byNumber.set(created.dtgsaDocumentNumber, {
        id: created.id,
        dtgsaDocumentNumber: created.dtgsaDocumentNumber,
        clientDocumentNumber: created.clientDocumentNumber,
        title: created.title,
      })

      if (clientNumber) {
        await updatePdiClientDocumentNumber({
          pdiItemId: created.id,
          clientDocumentNumber: clientNumber,
        })
      }

      results.push({
        rowNumber,
        outcome: "Added",
        dtgsaDocumentNumber: created.dtgsaDocumentNumber,
        clientDocumentNumber: clientNumber,
        title,
        pdiItemId: created.id,
      })
    } catch (error) {
      results.push({
        rowNumber,
        outcome: "Error",
        title,
        detail:
          error instanceof Error ? error.message : "Unknown import failure.",
      })
    }
  }

  const tally = (outcome: RowOutcome) =>
    results.filter((result) => result.outcome === outcome).length

  const run = await prisma.pdiImportRun.create({
    data: {
      registerId: register.id,
      projectId: project.id,
      importedByUserId: user.id,
      fileName: file.name || "pdi-import.xlsx",
      fileSha256: createHash("sha256").update(fileBytes).digest("hex"),
      rowCount: rows.length,
      addedCount: tally("Added"),
      numberedCount: tally("ClientNumberAssigned"),
      unchangedCount: tally("Unchanged"),
      conflictCount: tally("Conflict"),
      errorCount: tally("Error"),
      results: {
        create: results.map((result) => ({
          rowNumber: result.rowNumber,
          outcome: result.outcome,
          dtgsaDocumentNumber: result.dtgsaDocumentNumber ?? null,
          clientDocumentNumber: result.clientDocumentNumber ?? null,
          title: result.title ?? null,
          detail: result.detail ?? null,
          pdiItemId: result.pdiItemId ?? null,
        })),
      },
    },
    select: { id: true },
  })

  return {
    runId: run.id,
    rowCount: rows.length,
    addedCount: tally("Added"),
    numberedCount: tally("ClientNumberAssigned"),
    unchangedCount: tally("Unchanged"),
    conflictCount: tally("Conflict"),
    errorCount: tally("Error"),
    results,
  }
}

export async function getPortalPdiOverview(user: CurrentAppUser) {
  const isSystemClientDc = user.userRoles.some(
    (item) => item.role.code === ROLE_CODES.clientDocumentControlUser
  )

  const allowedProjectIds = isSystemClientDc
    ? null
    : user.projectRoles
        .filter(
          (item) => item.role.code === ROLE_CODES.clientDocumentControlUser
        )
        .map((item) => item.projectId)

  if (
    !isSystemClientDc &&
    allowedProjectIds !== null &&
    allowedProjectIds.length === 0
  ) {
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
    throw new Error(
      "You do not have access to update this PDI item in the portal."
    )
  }

  return updatePdiClientDocumentNumber(parsed)
}

function externalPortalPdiWhere(session: ExternalPortalSession) {
  const scopedPdiItemIds = session.invitation.pdiItems.map(
    (item) => item.pdiItemId
  )
  return {
    deletedAt: null,
    project: {
      clientId: session.clientId,
      ...(session.projectId ? { id: session.projectId } : {}),
    },
    ...(scopedPdiItemIds.length
      ? {
          id: {
            in: scopedPdiItemIds,
          },
        }
      : {}),
  }
}

export async function getExternalPortalPdiOverview(
  session: ExternalPortalSession
) {
  const items = await prisma.pdiItem.findMany({
    where: {
      ...externalPortalPdiWhere(session),
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
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      discipline: { select: { code: true, name: true } },
      documentTypeCategory: { select: { code: true, name: true } },
      releasePurpose: { select: { code: true, name: true } },
    },
  })
  return {
    items,
    projects: Array.from(
      new Map(items.map((item) => [item.project.id, item.project])).values()
    ),
  }
}

export async function updateExternalPortalPdiClientDocumentNumber(
  session: ExternalPortalSession,
  input: {
    pdiItemId: unknown
    clientDocumentNumber: unknown
  }
) {
  const parsed = updatePortalClientNumberSchema.parse(input)
  const item = await prisma.pdiItem.findUnique({
    where: { id: parsed.pdiItemId },
    select: {
      id: true,
      projectId: true,
      deletedAt: true,
      project: {
        select: { clientId: true },
      },
    },
  })
  if (!item || item.deletedAt) {
    throw new Error("The selected PDI item could not be found.")
  }
  assertExternalPortalScope(session, {
    clientId: item.project.clientId,
    projectId: item.projectId,
    pdiItemId: item.id,
  })
  return updatePdiClientDocumentNumber(parsed)
}

export async function exportExternalPortalPdiWorkbook(
  session: ExternalPortalSession,
  projectId: string
) {
  if (session.projectId && session.projectId !== projectId) {
    throw new Error("Cross-project portal access is denied.")
  }
  const items = await prisma.pdiItem.findMany({
    where: {
      ...externalPortalPdiWhere(session),
      projectId,
    },
    orderBy: [{ createdAt: "asc" }],
    include: {
      project: {
        select: {
          code: true,
          name: true,
          client: { select: { code: true, name: true } },
        },
      },
      discipline: { select: { code: true, name: true } },
      documentTypeCategory: { select: { code: true, name: true } },
      releasePurpose: { select: { code: true, name: true } },
    },
  })
  return await writePdiWorkbook(
    items.map((item) => ({
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
  )
}
