import "server-only"
import {
  FoundationRecordStatus,
  Prisma,
  type CoverTemplateVersion,
} from "@prisma/client"
import {
  DEFAULT_COVER_TEMPLATE,
  resolveCoverInheritance,
  stableCoverSnapshot,
  validateCoverTemplate,
  type CoverTemplateDocument,
} from "@dtg/cover-designer"
import { renderCoverTemplatePdf } from "@dtg/pdf-engine"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>
type CoverScopeType =
  | "ORGANIZATION"
  | "CLIENT"
  | "PROJECT"
  | "DOCUMENT_TYPE"
  | "DISCIPLINE"

function assertTemplateAdministrator(
  actor: CurrentAppUser,
  projectId?: string
) {
  if (
    !hasAnyPermission({
      required: [PERMISSIONS.templatesManage],
      systemRoles: actor.userRoles.map(({ role }) => role.code),
      projectRoles: actor.projectRoles
        .filter((role) => !projectId || role.projectId === projectId)
        .map(({ role }) => role.code),
    })
  ) {
    throw new Error("Cover template administration is not authorized.")
  }
}

function parseSnapshot(value: Prisma.JsonValue | null): CoverTemplateDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Cover template snapshot is missing.")
  }
  return value as unknown as CoverTemplateDocument
}

async function assertScopeExists(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  scopeType: CoverScopeType,
  scopeId?: string
) {
  if (scopeType === "ORGANIZATION") {
    if (scopeId) {
      throw new Error("Organization cover scope must not include a scope ID.")
    }
    return
  }
  if (!scopeId) {
    throw new Error(`${scopeType} cover scope requires a scope ID.`)
  }
  const exists =
    scopeType === "CLIENT"
      ? await tx.client.count({
          where: { id: scopeId, isActive: true, deletedAt: null },
        })
      : scopeType === "PROJECT"
        ? await tx.project.count({
            where: { id: scopeId, isActive: true, deletedAt: null },
          })
        : scopeType === "DOCUMENT_TYPE"
          ? await tx.documentTypeCategory.count({
              where: { id: scopeId, isActive: true },
            })
          : await tx.discipline.count({
              where: { id: scopeId, isActive: true },
            })
  if (!exists) {
    throw new Error(`${scopeType} cover scope does not exist or is inactive.`)
  }
}

async function replaceDraftContent(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  version: CoverTemplateVersion,
  template: CoverTemplateDocument
) {
  const issues = validateCoverTemplate(template)
  const stable = stableCoverSnapshot(template)
  await tx.coverLayoutElement.deleteMany({ where: { versionId: version.id } })
  await tx.coverFieldBinding.deleteMany({ where: { versionId: version.id } })
  await tx.signatureBox.deleteMany({ where: { versionId: version.id } })
  for (const element of template.elements) {
    await tx.coverLayoutElement.create({
      data: {
        versionId: version.id,
        elementType: element.type,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        locked: element.locked ?? false,
        properties: {
          text: element.text ?? null,
          binding: element.binding ?? null,
          workflowStepKey: element.workflowStepKey ?? null,
          roleLabel: element.roleLabel ?? null,
          specificAssignment: element.specificAssignment ?? null,
          ...element.properties,
        },
      },
    })
    if (element.binding) {
      await tx.coverFieldBinding.create({
        data: {
          versionId: version.id,
          fieldKey: element.id,
          bindingPath: element.binding,
          formatting: element.properties ?? undefined,
        },
      })
    }
    if (element.type === "SIGNATURE_BOX") {
      await tx.signatureBox.create({
        data: {
          versionId: version.id,
          boxKey: element.id,
          roleCode: element.roleLabel ?? "Signer",
          workflowStepKey: element.workflowStepKey,
          roleLabel: element.roleLabel,
          specificAssignment: element.specificAssignment,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          displayOptions: element.properties ?? undefined,
        },
      })
    }
  }
  return tx.coverTemplateVersion
    .update({
      where: { id: version.id },
      data: {
        pageSize: template.page.size,
        orientation: template.page.orientation,
        customWidthPt: template.page.customWidthPt,
        customHeightPt: template.page.customHeightPt,
        schemaVersion: template.schemaVersion,
        snapshot: stable.snapshot as unknown as Prisma.InputJsonValue,
        contentHash: stable.contentHash,
      },
    })
    .then((saved) => ({ saved, issues }))
}

export async function createVisualCoverDraft(input: {
  actor: CurrentAppUser
  code: string
  name: string
  scopeType: CoverScopeType
  scopeId?: string
  priority?: number
  cloneVersionId?: string
}) {
  assertTemplateAdministrator(
    input.actor,
    input.scopeType === "PROJECT" ? input.scopeId : undefined
  )
  return prisma.$transaction(async (tx) => {
    await assertScopeExists(tx, input.scopeType, input.scopeId)
    const template = await tx.coverTemplate.upsert({
      where: { code: input.code.trim().toUpperCase() },
      create: {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
      },
      update: {},
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    })
    const source = input.cloneVersionId
      ? await tx.coverTemplateVersion.findUnique({
          where: { id: input.cloneVersionId },
        })
      : null
    const document = source?.snapshot
      ? parseSnapshot(source.snapshot)
      : DEFAULT_COVER_TEMPLATE
    const version = await tx.coverTemplateVersion.create({
      data: {
        templateId: template.id,
        version: (template.versions[0]?.version ?? 0) + 1,
        pageSize: document.page.size,
        orientation: document.page.orientation,
      },
    })
    await tx.coverTemplateInheritanceRule.upsert({
      where: {
        templateId_scopeType_scopeId: {
          templateId: template.id,
          scopeType: input.scopeType,
          scopeId: input.scopeId ?? "",
        },
      },
      create: {
        templateId: template.id,
        scopeType: input.scopeType,
        scopeId: input.scopeId ?? "",
        priority: input.priority ?? 0,
      },
      update: {
        priority: input.priority ?? 0,
        isActive: true,
      },
    })
    const result = await replaceDraftContent(tx, version, document)
    await tx.auditLog.create({
      data: {
        actorUserId: input.actor.id,
        action: source ? "cover.visual.clone" : "cover.visual.draft_created",
        entityType: "CoverTemplateVersion",
        entityId: version.id,
        projectId: input.scopeType === "PROJECT" ? input.scopeId : null,
        afterSnapshot: {
          templateId: template.id,
          version: version.version,
          scopeType: input.scopeType,
          scopeId: input.scopeId ?? null,
          clonedFromVersionId: source?.id ?? null,
        },
      },
    })
    return result.saved
  })
}

export async function saveVisualCoverDraft(input: {
  actor: CurrentAppUser
  versionId: string
  template: CoverTemplateDocument
}) {
  const version = await prisma.coverTemplateVersion.findUnique({
    where: { id: input.versionId },
  })
  if (!version || version.status !== FoundationRecordStatus.Draft) {
    throw new Error("Only a draft cover version may be edited.")
  }
  assertTemplateAdministrator(input.actor)
  return prisma.$transaction(async (tx) => {
    const result = await replaceDraftContent(tx, version, input.template)
    await tx.auditLog.create({
      data: {
        actorUserId: input.actor.id,
        action: "cover.visual.draft_saved",
        entityType: "CoverTemplateVersion",
        entityId: version.id,
        afterSnapshot: {
          contentHash: result.saved.contentHash,
          issueCount: result.issues.length,
        },
      },
    })
    return result
  })
}

export async function publishVisualCoverVersion(input: {
  actor: CurrentAppUser
  versionId: string
}) {
  assertTemplateAdministrator(input.actor)
  return prisma.$transaction(async (tx) => {
    const version = await tx.coverTemplateVersion.findUnique({
      where: { id: input.versionId },
    })
    if (!version || version.status !== FoundationRecordStatus.Draft) {
      throw new Error("Only a draft cover version may be published.")
    }
    const template = parseSnapshot(version.snapshot)
    const issues = validateCoverTemplate(template)
    if (issues.length > 0) {
      throw new Error(
        `Cover template cannot publish: ${issues
          .map((issue) => issue.code)
          .join(", ")}`
      )
    }
    await renderCoverTemplatePdf({
      template,
      values: {
        "document.title": "Sample Engineering Document",
        "verification.qr": "https://verify.example/sample",
      },
      signatures: {
        prepared: {
          name: "Sample Manager",
          jobTitle: "Engineering Manager",
          signedAt: "2026-07-29",
          referenceId: "SAMPLE-EVIDENCE",
        },
      },
    })
    await tx.coverTemplateVersion.updateMany({
      where: {
        templateId: version.templateId,
        status: FoundationRecordStatus.Published,
      },
      data: {
        status: FoundationRecordStatus.Superseded,
        supersededAt: new Date(),
      },
    })
    const published = await tx.coverTemplateVersion.update({
      where: { id: version.id },
      data: {
        status: FoundationRecordStatus.Published,
        publishedAt: new Date(),
        publishedByUserId: input.actor.id,
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: input.actor.id,
        action: "cover.visual.published",
        entityType: "CoverTemplateVersion",
        entityId: version.id,
        afterSnapshot: {
          contentHash: published.contentHash,
          version: published.version,
        },
      },
    })
    return published
  })
}

export async function archiveVisualCoverVersion(input: {
  actor: CurrentAppUser
  versionId: string
}) {
  assertTemplateAdministrator(input.actor)
  const version = await prisma.coverTemplateVersion.findUnique({
    where: { id: input.versionId },
  })
  if (
    !version ||
    (version.status !== FoundationRecordStatus.Draft &&
      version.status !== FoundationRecordStatus.Superseded)
  ) {
    throw new Error("Only draft or superseded cover versions may be archived.")
  }
  return prisma.coverTemplateVersion.update({
    where: { id: version.id },
    data: { status: FoundationRecordStatus.Archived },
  })
}

export async function resolvePublishedVisualCover(input: {
  clientId?: string
  projectId?: string
  documentTypeId?: string
  disciplineId?: string
}) {
  const rules = await prisma.coverTemplateInheritanceRule.findMany({
    where: { isActive: true },
  })
  const templateIds = [...new Set(rules.map((rule) => rule.templateId))]
  const versions = await prisma.coverTemplateVersion.findMany({
    where: {
      templateId: { in: templateIds },
      status: FoundationRecordStatus.Published,
    },
  })
  const versionByTemplate = new Map(
    versions.map((version) => [version.templateId, version])
  )
  const resolved = resolveCoverInheritance(
    rules.flatMap((rule) => {
      const version = versionByTemplate.get(rule.templateId)
      return version?.publishedAt
        ? [
            {
              templateId: rule.templateId,
              versionId: version.id,
              scopeType: rule.scopeType as Parameters<
                typeof resolveCoverInheritance
              >[0][number]["scopeType"],
              scopeId: rule.scopeId || null,
              priority: rule.priority,
              publishedAt: version.publishedAt,
            },
          ]
        : []
    }),
    input
  )
  return resolved ? (versionByTemplate.get(resolved.templateId) ?? null) : null
}

export async function getProjectResponseLegend(projectId: string) {
  const configuration =
    await prisma.projectResponseCodeConfiguration.findUnique({
      where: { projectId },
    })
  if (!configuration) return []
  return prisma.clientResponseCode.findMany({
    where: { versionId: configuration.codeSetVersionId },
    orderBy: [{ displayOrder: "asc" }, { externalCode: "asc" }],
    select: {
      externalCode: true,
      exactWording: true,
    },
  })
}

export async function getVisualCoverDesignerOverview() {
  const [versions, rules, clients, projects, documentTypes, disciplines] =
    await Promise.all([
      prisma.coverTemplateVersion.findMany({
        orderBy: [{ createdAt: "desc" }],
        include: {
          template: { select: { code: true, name: true } },
        },
        take: 100,
      }),
      prisma.coverTemplateInheritanceRule.findMany({
        where: { isActive: true },
        orderBy: [{ priority: "desc" }],
      }),
      prisma.client.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.project.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.documentTypeCategory.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.discipline.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
    ])
  return {
    versions: versions.map((version) => ({
      id: version.id,
      templateId: version.templateId,
      code: version.template.code,
      name: version.template.name,
      version: version.version,
      status: version.status,
      pageSize: version.pageSize,
      orientation: version.orientation,
      contentHash: version.contentHash,
      snapshot:
        version.status === FoundationRecordStatus.Draft
          ? version.snapshot
          : null,
      createdAt: version.createdAt.toISOString(),
    })),
    rules: rules.map((rule) => ({
      templateId: rule.templateId,
      scopeType: rule.scopeType,
      scopeId: rule.scopeId,
      priority: rule.priority,
    })),
    options: {
      clients,
      projects,
      documentTypes,
      disciplines,
    },
  }
}
