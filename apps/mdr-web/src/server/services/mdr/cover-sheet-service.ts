import "server-only"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  AuditSeverity,
  CoverSheetKind,
  DocumentFileType,
  GeneratedDocumentKind,
  Prisma,
  StorageProvider,
  WorkflowStepType,
} from "@prisma/client"
import { env } from "@/lib/config/env"
import { convertDocxToPdf } from "@/lib/docx/libreoffice"
import { createCoverPdfBuffer, mergePdfBuffers } from "@/lib/pdf/toolkit"
import { renderCoverTemplatePdf } from "@dtg/pdf-engine"
import type { CoverTemplateDocument } from "@dtg/cover-designer"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import {
  buildStorageKey,
  downloadFileFromStorage,
  uploadBytesToStorage,
} from "@/server/services/storage/storage-service"
import { renderDocxTemplateFromStorage } from "@/server/services/templates/docx-template-service"
import { findPreferredCoverSheetTemplate } from "@/server/services/templates/template-management-service"
import {
  getProjectResponseLegend,
  resolvePublishedVisualCover,
} from "@/server/services/templates/visual-cover-template-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>
type RenderedCover = {
  bytes: Buffer
  visual: {
    templateVersionId: string
    contentHash: string
    outputHash: string
    rendererVersion: string
    templateSnapshot: Prisma.JsonValue
  } | null
}

function assertMdrPermission(user: CurrentAppUser, projectId: string) {
  const allowed = hasAnyPermission({
    required: [
      PERMISSIONS.mdrManage,
      PERMISSIONS.workflowPrepare,
      PERMISSIONS.dcCheck,
    ],
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: user.projectRoles
      .filter((item) => item.projectId === projectId)
      .map((item) => item.role.code),
  })

  if (!allowed) {
    throw new Error(
      "You do not have permission to generate covers or packages."
    )
  }
}

async function loadSignatureBytes(
  storageProvider: StorageProvider | null,
  providerKey: string | null
) {
  if (!storageProvider || !providerKey) {
    return null
  }

  return downloadFileFromStorage(storageProvider, providerKey).catch(() => null)
}

async function getRevisionPackageContext(revisionId: string) {
  const revision = await prisma.documentRevision.findUnique({
    where: {
      id: revisionId,
    },
    include: {
      document: {
        include: {
          project: {
            include: {
              client: true,
            },
          },
          discipline: true,
          documentTypeCategory: true,
          releasePurpose: true,
        },
      },
      workflowSteps: {
        orderBy: [{ stepOrder: "asc" }],
        include: {
          signatureEvent: {
            include: {
              signatureProfile: true,
            },
          },
        },
      },
      files: {
        where: {
          deletedAt: null,
        },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  })

  if (!revision || revision.deletedAt) {
    throw new Error("The selected revision could not be found.")
  }

  return revision
}

function buildCoverTemplateData(input: {
  revision: Awaited<ReturnType<typeof getRevisionPackageContext>>
  kind: CoverSheetKind
}) {
  const { revision, kind } = input
  const prepared = revision.workflowSteps.find(
    (step) => step.stepType === WorkflowStepType.Prepared
  )
  const reviewed = revision.workflowSteps.find(
    (step) => step.stepType === WorkflowStepType.Reviewed
  )
  const approved = revision.workflowSteps.find(
    (step) => step.stepType === WorkflowStepType.Approved
  )

  return {
    cover_kind: kind,
    project_title: revision.document.project.name,
    project_code: revision.document.project.code,
    client_name: revision.document.project.client.name,
    client_code: revision.document.project.client.code,
    client_logo: revision.document.project.client.logoBase64
      ? `data:${revision.document.project.client.logoMimeType ?? "image/png"};base64,${revision.document.project.client.logoBase64}`
      : "",
    contract_number: revision.document.project.contractNumber ?? "",
    dtgsa_document_number: revision.document.dtgsaDocumentNumber,
    client_document_number: revision.document.clientDocumentNumber ?? "",
    document_title: revision.document.title,
    revision: revision.revisionLabel,
    release_purpose: revision.document.releasePurpose?.code ?? "",
    discipline: revision.document.discipline.code,
    document_type: revision.document.documentTypeCategory?.code ?? "",
    date: new Date().toLocaleDateString("en-GB"),
    prepared_by: prepared?.signatureEvent?.userDisplayNameSnapshot ?? "",
    reviewed_by: reviewed?.signatureEvent?.userDisplayNameSnapshot ?? "",
    approved_by: approved?.signatureEvent?.userDisplayNameSnapshot ?? "",
    prepared_at:
      prepared?.signatureEvent?.signedAt?.toLocaleString("en-US") ?? "",
    reviewed_at:
      reviewed?.signatureEvent?.signedAt?.toLocaleString("en-US") ?? "",
    approved_at:
      approved?.signatureEvent?.signedAt?.toLocaleString("en-US") ?? "",
    tags: "",
  }
}

async function renderCoverFromTemplate(input: {
  revision: Awaited<ReturnType<typeof getRevisionPackageContext>>
  kind: CoverSheetKind
}) {
  const visual = await resolvePublishedVisualCover({
    clientId: input.revision.document.project.clientId,
    projectId: input.revision.document.projectId,
    documentTypeId: input.revision.document.documentTypeCategoryId ?? undefined,
    disciplineId: input.revision.document.disciplineId,
  })
  if (visual?.snapshot) {
    try {
      const data = buildCoverTemplateData(input)
      const signatureSteps = await Promise.all(
        input.revision.workflowSteps.map(async (step) => ({
          key: step.stepType.toLowerCase().replace("dccheck", "dc-validated"),
          event: step.signatureEvent,
          appearanceBytes: await loadSignatureBytes(
            step.signatureEvent?.signatureStorageProvider ?? null,
            step.signatureEvent?.signatureProviderKey ?? null
          ),
        }))
      )
      const responseLegend = await getProjectResponseLegend(
        input.revision.document.projectId
      )
      const visualTemplate = visual.snapshot as unknown as CoverTemplateDocument
      const clientLogo = input.revision.document.project.client.logoBase64
        ? {
            bytes: Buffer.from(
              input.revision.document.project.client.logoBase64,
              "base64"
            ),
            mimeType:
              input.revision.document.project.client.logoMimeType ===
              "image/png"
                ? ("image/png" as const)
                : input.revision.document.project.client.logoMimeType ===
                    "image/jpeg"
                  ? ("image/jpeg" as const)
                  : null,
          }
        : null
      const rendered = await renderCoverTemplatePdf({
        template: visualTemplate,
        values: {
          "client.name": data.client_name,
          "project.name": data.project_title,
          "project.code": data.project_code,
          "document.number": data.dtgsa_document_number,
          "document.clientNumber": data.client_document_number,
          "document.title": data.document_title,
          "document.revision": data.revision,
          "document.discipline": data.discipline,
          "document.type": data.document_type,
          "document.releasePurpose": data.release_purpose,
          "document.date": data.date,
          "workflow.preparedBy": data.prepared_by,
          "workflow.reviewer": data.reviewed_by,
          "workflow.approver": data.approved_by,
          "verification.qr": `${env.NEXT_PUBLIC_APP_URL}/verify`,
        },
        signatures: Object.fromEntries(
          signatureSteps
            .filter((item) => item.event)
            .map((item) => [
              item.key,
              {
                name: item.event!.userDisplayNameSnapshot,
                signedAt: item.event!.signedAt.toISOString(),
                referenceId: item.event!.id,
                appearanceBytes: item.appearanceBytes ?? undefined,
              },
            ])
        ),
        responseLegend: responseLegend.map((code) => ({
          externalCode: code.externalCode,
          wording: code.exactWording,
        })),
        images:
          clientLogo?.mimeType && clientLogo.bytes.length > 0
            ? Object.fromEntries(
                visualTemplate.elements
                  .filter(
                    (element) =>
                      element.type === "IMAGE" &&
                      element.binding === "client.logo"
                  )
                  .map((element) => [
                    element.id,
                    {
                      bytes: clientLogo.bytes,
                      mimeType: clientLogo.mimeType!,
                    },
                  ])
              )
            : undefined,
      })
      return {
        bytes: rendered.bytes,
        visual: {
          templateVersionId: visual.id,
          contentHash: visual.contentHash!,
          outputHash: rendered.outputHash,
          rendererVersion: rendered.rendererVersion,
          templateSnapshot: visual.snapshot,
        },
      } satisfies RenderedCover
    } catch (error) {
      await prisma.systemLog.create({
        data: {
          source: "cover_sheet",
          action: "visual_template.render_failed",
          message:
            error instanceof Error
              ? error.message
              : "Unknown visual cover rendering failure.",
          entityType: "CoverTemplateVersion",
          entityId: visual.id,
          projectId: input.revision.document.projectId,
          clientId: input.revision.document.project.clientId,
        },
      })
    }
  }

  const template = await findPreferredCoverSheetTemplate({
    kind: input.kind,
    clientId: input.revision.document.project.clientId,
    projectId: input.revision.document.projectId,
  })

  if (!template) {
    return null
  }

  const tempDir = await mkdtemp(join(tmpdir(), "dtgsa-cover-"))

  try {
    const docxBuffer = await renderDocxTemplateFromStorage(
      template,
      buildCoverTemplateData(input)
    )
    const inputPath = join(tempDir, `${input.kind.toLowerCase()}.docx`)
    await writeFile(inputPath, docxBuffer)
    const outputPath = await convertDocxToPdf(inputPath, tempDir)
    return {
      bytes: await readFile(outputPath),
      visual: null,
    } satisfies RenderedCover
  } catch (error) {
    await prisma.systemLog.create({
      data: {
        source: "cover_sheet",
        action: "template.render_failed",
        message:
          error instanceof Error
            ? error.message
            : "Unknown cover template rendering failure.",
        entityType: "DocumentRevision",
        entityId: input.revision.id,
        projectId: input.revision.document.projectId,
        clientId: input.revision.document.project.clientId,
      },
    })

    return null
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true,
    }).catch(() => undefined)
  }
}

// The PO / contract number is printed on every cover sheet, so a project
// without one cannot issue covers. Project creation deliberately stays possible
// without it; only issuance is gated.
function assertCoverIssuanceAllowed(revision: {
  document: { project: { code: string; contractNumber: string | null } }
}) {
  if (!revision.document.project.contractNumber?.trim()) {
    throw new Error(
      `Project ${revision.document.project.code} has no PO or contract number. Add it to the project before issuing cover sheets, because it is printed on every cover.`
    )
  }
}

export async function generateRevisionCoverSheets(
  actor: CurrentAppUser,
  revisionId: string
) {
  const revision = await getRevisionPackageContext(revisionId)
  assertMdrPermission(actor, revision.document.projectId)
  assertCoverIssuanceAllowed(revision)

  const prepared = revision.workflowSteps.find(
    (step) => step.stepType === WorkflowStepType.Prepared
  )
  const reviewed = revision.workflowSteps.find(
    (step) => step.stepType === WorkflowStepType.Reviewed
  )
  const approved = revision.workflowSteps.find(
    (step) => step.stepType === WorkflowStepType.Approved
  )

  const [preparedSignature, reviewedSignature, approvedSignature] =
    await Promise.all([
      loadSignatureBytes(
        prepared?.signatureEvent?.signatureStorageProvider ?? null,
        prepared?.signatureEvent?.signatureProviderKey ?? null
      ),
      loadSignatureBytes(
        reviewed?.signatureEvent?.signatureStorageProvider ?? null,
        reviewed?.signatureEvent?.signatureProviderKey ?? null
      ),
      loadSignatureBytes(
        approved?.signatureEvent?.signatureStorageProvider ?? null,
        approved?.signatureEvent?.signatureProviderKey ?? null
      ),
    ])

  const baseSections = [
    {
      label: "Project",
      value: `${revision.document.project.code} - ${revision.document.project.name}`,
    },
    {
      label: "Client",
      value: `${revision.document.project.client.code} - ${revision.document.project.client.name}`,
    },
    {
      label: "DTGSA document number",
      value: revision.document.dtgsaDocumentNumber,
    },
    {
      label: "Client document number",
      value: revision.document.clientDocumentNumber ?? "Pending",
    },
    {
      label: "Document title",
      value: revision.document.title,
    },
    {
      label: "Revision / release",
      value: `Rev ${revision.revisionLabel} / ${revision.document.releasePurpose?.code ?? "N/A"}`,
    },
    {
      label: "Discipline / type",
      value: `${revision.document.discipline.code} / ${revision.document.documentTypeCategory?.code ?? "N/A"}`,
    },
  ]

  const signatures = [
    {
      label: "Prepared By",
      name: prepared?.signatureEvent?.userDisplayNameSnapshot ?? null,
      signedAt: prepared?.signatureEvent?.signedAt ?? null,
      imageBytes: preparedSignature,
    },
    {
      label: "Reviewed By",
      name: reviewed?.signatureEvent?.userDisplayNameSnapshot ?? null,
      signedAt: reviewed?.signatureEvent?.signedAt ?? null,
      imageBytes: reviewedSignature,
    },
    {
      label: "Approved By",
      name: approved?.signatureEvent?.userDisplayNameSnapshot ?? null,
      signedAt: approved?.signatureEvent?.signedAt ?? null,
      imageBytes: approvedSignature,
    },
  ]

  const [templatedDtgCover, templatedClientCover] = await Promise.all([
    renderCoverFromTemplate({
      revision,
      kind: CoverSheetKind.DTGSA_COVER,
    }),
    renderCoverFromTemplate({
      revision,
      kind: CoverSheetKind.CLIENT_COVER,
    }),
  ])

  const fallbackDtgCover = createCoverPdfBuffer({
    title: "DTGSA Cover Sheet",
    subtitle: "Generated enterprise cover for internal submission control",
    sections: baseSections,
    signatures,
  })
  const fallbackClientCover = createCoverPdfBuffer({
    title: "Client Cover Sheet",
    subtitle: "Generated client-facing cover for outbound document packages",
    sections: baseSections,
    signatures,
  })

  const [fallbackDtgBuffer, fallbackClientBuffer] = await Promise.all([
    fallbackDtgCover,
    fallbackClientCover,
  ])

  const dtgCoverBuffer = templatedDtgCover?.bytes ?? fallbackDtgBuffer
  const clientCoverBuffer = templatedClientCover?.bytes ?? fallbackClientBuffer

  const baseKey = buildStorageKey(
    "projects",
    revision.document.project.code,
    revision.document.dtgsaDocumentNumber,
    `rev-${revision.revisionLabel}`,
    "covers"
  )

  const dtgCoverUpload = await uploadBytesToStorage({
    area: "controlled",
    providerKeyHint: templatedDtgCover?.visual
      ? `${baseKey}/dtgsa-cover-${templatedDtgCover.visual.outputHash}.pdf`
      : `${baseKey}/dtgsa-cover.pdf`,
    bytes: dtgCoverBuffer,
    fileName: `DTGSA-Cover-${revision.document.dtgsaDocumentNumber}-Rev-${revision.revisionLabel}.pdf`,
    mimeType: "application/pdf",
  })
  const clientCoverUpload = await uploadBytesToStorage({
    area: "controlled",
    providerKeyHint: templatedClientCover?.visual
      ? `${baseKey}/client-cover-${templatedClientCover.visual.outputHash}.pdf`
      : `${baseKey}/client-cover.pdf`,
    bytes: clientCoverBuffer,
    fileName: `Client-Cover-${revision.document.dtgsaDocumentNumber}-Rev-${revision.revisionLabel}.pdf`,
    mimeType: "application/pdf",
  })

  return prisma.$transaction(async (tx) => {
    const activeCycle = await tx.approvalCycle.findFirst({
      where: { revisionId: revision.id, isActive: true },
      orderBy: { cycleNumber: "desc" },
      select: { snapshotId: true },
    })
    await tx.documentFile.updateMany({
      where: {
        documentRevisionId: revision.id,
        type: {
          in: [DocumentFileType.DTG_COVER, DocumentFileType.CLIENT_COVER],
        },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    })

    const [dtgFile, clientFile] = await Promise.all([
      tx.documentFile.create({
        data: {
          documentRevisionId: revision.id,
          projectId: revision.document.projectId,
          type: DocumentFileType.DTG_COVER,
          storageProvider: dtgCoverUpload.storageProvider,
          providerKey: dtgCoverUpload.providerKey,
          fileName: dtgCoverUpload.fileName,
          mimeType: dtgCoverUpload.mimeType,
          fileSizeBytes: dtgCoverUpload.fileSizeBytes,
          checksum: dtgCoverUpload.checksum,
          uploadedByUserId: actor.id,
        },
      }),
      tx.documentFile.create({
        data: {
          documentRevisionId: revision.id,
          projectId: revision.document.projectId,
          type: DocumentFileType.CLIENT_COVER,
          storageProvider: clientCoverUpload.storageProvider,
          providerKey: clientCoverUpload.providerKey,
          fileName: clientCoverUpload.fileName,
          mimeType: clientCoverUpload.mimeType,
          fileSizeBytes: clientCoverUpload.fileSizeBytes,
          checksum: clientCoverUpload.checksum,
          uploadedByUserId: actor.id,
        },
      }),
    ])

    await tx.generatedDocument.createMany({
      data: [
        {
          documentRevisionId: revision.id,
          kind: GeneratedDocumentKind.DTGSA_COVER_PDF,
          fileName: dtgCoverUpload.fileName,
          storageProvider: dtgCoverUpload.storageProvider,
          providerKey: dtgCoverUpload.providerKey,
          generatedByUserId: actor.id,
        },
        {
          documentRevisionId: revision.id,
          kind: GeneratedDocumentKind.CLIENT_COVER_PDF,
          fileName: clientCoverUpload.fileName,
          storageProvider: clientCoverUpload.storageProvider,
          providerKey: clientCoverUpload.providerKey,
          generatedByUserId: actor.id,
        },
      ],
    })

    const visualCovers = [
      {
        render: templatedDtgCover?.visual,
        upload: dtgCoverUpload,
      },
      {
        render: templatedClientCover?.visual,
        upload: clientCoverUpload,
      },
    ]
    for (const item of visualCovers) {
      if (!item.render) continue
      const fileObject = await tx.fileObject.upsert({
        where: {
          storageProvider_providerKey: {
            storageProvider: item.upload.storageProvider,
            providerKey: item.upload.providerKey,
          },
        },
        create: {
          storageProvider: item.upload.storageProvider,
          providerKey: item.upload.providerKey,
          fileName: item.upload.fileName,
          mimeType: item.upload.mimeType,
          sizeBytes: BigInt(item.upload.fileSizeBytes),
          checksum: item.upload.checksum,
        },
        update: {},
      })
      await tx.generatedCover.create({
        data: {
          revisionId: revision.id,
          templateVersionId: item.render.templateVersionId,
          workflowSnapshotId: activeCycle?.snapshotId,
          fileObjectId: fileObject.id,
          contentHash: item.render.contentHash,
          outputHash: item.render.outputHash,
          rendererVersion: item.render.rendererVersion,
          templateSnapshot: item.render
            .templateSnapshot as Prisma.InputJsonValue,
        },
      })
    }

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "cover_sheet.generate",
        entityType: "DocumentRevision",
        entityId: revision.id,
        projectId: revision.document.projectId,
        clientId: revision.document.project.clientId,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          dtgCoverFileId: dtgFile.id,
          clientCoverFileId: clientFile.id,
        },
      },
    })

    return {
      dtgFileId: dtgFile.id,
      clientFileId: clientFile.id,
    }
  })
}

export async function generateMergedRevisionPackage(
  actor: CurrentAppUser,
  revisionId: string
) {
  const revision = await getRevisionPackageContext(revisionId)
  assertMdrPermission(actor, revision.document.projectId)

  const sourceFiles = revision.files.filter(
    (file) =>
      file.deletedAt === null &&
      (file.type === DocumentFileType.SOURCE ||
        file.type === DocumentFileType.REVISION_SOURCE) &&
      file.providerKey &&
      (file.mimeType === "application/pdf" ||
        file.fileName.toLowerCase().endsWith(".pdf"))
  )
  const coverFiles = revision.files.filter(
    (file) =>
      file.deletedAt === null &&
      (file.type === DocumentFileType.DTG_COVER ||
        file.type === DocumentFileType.CLIENT_COVER) &&
      file.providerKey
  )

  if (sourceFiles.length === 0) {
    throw new Error(
      "At least one PDF source file is required to build the merged package."
    )
  }

  const buffers = await Promise.all(
    [...coverFiles, ...sourceFiles].map((file) =>
      downloadFileFromStorage(file.storageProvider, file.providerKey)
    )
  )

  const mergedBuffer = await mergePdfBuffers(buffers)
  const mergedUpload = await uploadBytesToStorage({
    area: "controlled",
    providerKeyHint: buildStorageKey(
      "projects",
      revision.document.project.code,
      revision.document.dtgsaDocumentNumber,
      `rev-${revision.revisionLabel}`,
      "merged",
      "final-package.pdf"
    ),
    bytes: mergedBuffer,
    fileName: `Merged-${revision.document.dtgsaDocumentNumber}-Rev-${revision.revisionLabel}.pdf`,
    mimeType: "application/pdf",
  })

  return prisma.$transaction(async (tx) => {
    await tx.documentFile.updateMany({
      where: {
        documentRevisionId: revision.id,
        type: DocumentFileType.MERGED,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    })

    const mergedFile = await tx.documentFile.create({
      data: {
        documentRevisionId: revision.id,
        projectId: revision.document.projectId,
        type: DocumentFileType.MERGED,
        storageProvider: mergedUpload.storageProvider,
        providerKey: mergedUpload.providerKey,
        fileName: mergedUpload.fileName,
        mimeType: mergedUpload.mimeType,
        fileSizeBytes: mergedUpload.fileSizeBytes,
        checksum: mergedUpload.checksum,
        uploadedByUserId: actor.id,
      },
    })

    await tx.generatedDocument.create({
      data: {
        documentRevisionId: revision.id,
        kind: GeneratedDocumentKind.MERGED_PDF,
        fileName: mergedUpload.fileName,
        storageProvider: mergedUpload.storageProvider,
        providerKey: mergedUpload.providerKey,
        generatedByUserId: actor.id,
      },
    })

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "document_package.generate",
        entityType: "DocumentRevision",
        entityId: revision.id,
        projectId: revision.document.projectId,
        clientId: revision.document.project.clientId,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          mergedFileId: mergedFile.id,
          includedSourceCount: sourceFiles.length,
          includedCoverCount: coverFiles.length,
        },
      },
    })

    return mergedFile
  })
}
