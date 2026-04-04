import "server-only"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  AuditSeverity,
  CoverSheetKind,
  DriveFolderType,
  DocumentFileType,
  GeneratedDocumentKind,
  StorageProvider,
  WorkflowStepType,
} from "@prisma/client"
import { env } from "@/lib/config/env"
import { convertDocxToPdf } from "@/lib/docx/libreoffice"
import { createCoverPdfBuffer, mergePdfBuffers } from "@/lib/pdf/toolkit"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { uploadProjectFileToGoogleDrive } from "@/server/services/drive/project-drive-service"
import {
  buildStoragePath,
  downloadFileFromSupabaseStorage,
  uploadBytesToSupabaseStorage,
} from "@/server/services/storage/storage-service"
import { renderDocxTemplateFromStorage } from "@/server/services/templates/docx-template-service"
import { findPreferredCoverSheetTemplate } from "@/server/services/templates/template-management-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

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
    throw new Error("You do not have permission to generate covers or packages.")
  }
}

async function loadSignatureBytes(
  storageBucket: string | null,
  signaturePath: string | null
) {
  if (!storageBucket || !signaturePath) {
    return null
  }

  return downloadFileFromSupabaseStorage(storageBucket, signaturePath).catch(
    () => null
  )
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
    prepared_at: prepared?.signatureEvent?.signedAt?.toLocaleString("en-US") ?? "",
    reviewed_at: reviewed?.signatureEvent?.signedAt?.toLocaleString("en-US") ?? "",
    approved_at: approved?.signatureEvent?.signedAt?.toLocaleString("en-US") ?? "",
    tags: "",
  }
}

async function renderCoverFromTemplate(input: {
  revision: Awaited<ReturnType<typeof getRevisionPackageContext>>
  kind: CoverSheetKind
}) {
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
    return await readFile(outputPath)
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

export async function generateRevisionCoverSheets(
  actor: CurrentAppUser,
  revisionId: string
) {
  const revision = await getRevisionPackageContext(revisionId)
  assertMdrPermission(actor, revision.document.projectId)

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
        prepared?.signatureEvent?.signatureProfile?.storageBucket ?? null,
        prepared?.signatureEvent?.signatureImagePath ?? null
      ),
      loadSignatureBytes(
        reviewed?.signatureEvent?.signatureProfile?.storageBucket ?? null,
        reviewed?.signatureEvent?.signatureImagePath ?? null
      ),
      loadSignatureBytes(
        approved?.signatureEvent?.signatureProfile?.storageBucket ?? null,
        approved?.signatureEvent?.signatureImagePath ?? null
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

  const dtgCoverBuffer =
    templatedDtgCover ??
    fallbackDtgBuffer
  const clientCoverBuffer =
    templatedClientCover ??
    fallbackClientBuffer

  const basePath = buildStoragePath(
    "projects",
    revision.document.project.code,
    revision.document.dtgsaDocumentNumber,
    `rev-${revision.revisionLabel}`,
    "covers"
  )

  const dtgCoverUpload = await uploadBytesToSupabaseStorage({
    bucket: env.SUPABASE_STORAGE_BUCKET_GENERATED,
    path: `${basePath}/dtgsa-cover.pdf`,
    bytes: dtgCoverBuffer,
    fileName: `DTGSA-Cover-${revision.document.dtgsaDocumentNumber}-Rev-${revision.revisionLabel}.pdf`,
    mimeType: "application/pdf",
    upsert: true,
  })
  const clientCoverUpload = await uploadBytesToSupabaseStorage({
    bucket: env.SUPABASE_STORAGE_BUCKET_GENERATED,
    path: `${basePath}/client-cover.pdf`,
    bytes: clientCoverBuffer,
    fileName: `Client-Cover-${revision.document.dtgsaDocumentNumber}-Rev-${revision.revisionLabel}.pdf`,
    mimeType: "application/pdf",
    upsert: true,
  })

  const [dtgDriveUpload, clientDriveUpload] = await Promise.all([
    uploadProjectFileToGoogleDrive({
      projectId: revision.document.projectId,
      folderType: DriveFolderType.MDR,
      fileName: dtgCoverUpload.fileName,
      bytes: dtgCoverBuffer,
      mimeType: dtgCoverUpload.mimeType,
      actorUserId: actor.id,
    }),
    uploadProjectFileToGoogleDrive({
      projectId: revision.document.projectId,
      folderType: DriveFolderType.MDR,
      fileName: clientCoverUpload.fileName,
      bytes: clientCoverBuffer,
      mimeType: clientCoverUpload.mimeType,
      actorUserId: actor.id,
    }),
  ])

  return prisma.$transaction(async (tx) => {
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
          storageProvider: StorageProvider.Supabase,
          fileName: dtgCoverUpload.fileName,
          mimeType: dtgCoverUpload.mimeType,
          fileSizeBytes: dtgCoverUpload.fileSizeBytes,
          storageBucket: dtgCoverUpload.bucket,
          storagePath: dtgCoverUpload.path,
          googleDriveFileId: dtgDriveUpload?.fileId ?? null,
          googleDriveFolderId: dtgDriveUpload?.folderId ?? null,
          checksum: dtgCoverUpload.checksum,
          uploadedByUserId: actor.id,
        },
      }),
      tx.documentFile.create({
        data: {
          documentRevisionId: revision.id,
          projectId: revision.document.projectId,
          type: DocumentFileType.CLIENT_COVER,
          storageProvider: StorageProvider.Supabase,
          fileName: clientCoverUpload.fileName,
          mimeType: clientCoverUpload.mimeType,
          fileSizeBytes: clientCoverUpload.fileSizeBytes,
          storageBucket: clientCoverUpload.bucket,
          storagePath: clientCoverUpload.path,
          googleDriveFileId: clientDriveUpload?.fileId ?? null,
          googleDriveFolderId: clientDriveUpload?.folderId ?? null,
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
          storageProvider: StorageProvider.Supabase,
          storageBucket: dtgCoverUpload.bucket,
          storagePath: dtgCoverUpload.path,
          googleDriveFileId: dtgDriveUpload?.fileId ?? null,
          generatedByUserId: actor.id,
        },
        {
          documentRevisionId: revision.id,
          kind: GeneratedDocumentKind.CLIENT_COVER_PDF,
          fileName: clientCoverUpload.fileName,
          storageProvider: StorageProvider.Supabase,
          storageBucket: clientCoverUpload.bucket,
          storagePath: clientCoverUpload.path,
          googleDriveFileId: clientDriveUpload?.fileId ?? null,
          generatedByUserId: actor.id,
        },
      ],
    })

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
      file.storageBucket &&
      file.storagePath &&
      (file.mimeType === "application/pdf" || file.fileName.toLowerCase().endsWith(".pdf"))
  )
  const coverFiles = revision.files.filter(
    (file) =>
      file.deletedAt === null &&
      (file.type === DocumentFileType.DTG_COVER ||
        file.type === DocumentFileType.CLIENT_COVER) &&
      file.storageBucket &&
      file.storagePath
  )

  if (sourceFiles.length === 0) {
    throw new Error("At least one PDF source file is required to build the merged package.")
  }

  const buffers = await Promise.all(
    [...coverFiles, ...sourceFiles].map((file) =>
      downloadFileFromSupabaseStorage(file.storageBucket!, file.storagePath!)
    )
  )

  const mergedBuffer = await mergePdfBuffers(buffers)
  const mergedUpload = await uploadBytesToSupabaseStorage({
    bucket: env.SUPABASE_STORAGE_BUCKET_GENERATED,
    path: buildStoragePath(
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
    upsert: true,
  })

  const driveUpload = await uploadProjectFileToGoogleDrive({
    projectId: revision.document.projectId,
    folderType: DriveFolderType.SUBMITTED,
    fileName: mergedUpload.fileName,
    bytes: mergedBuffer,
    mimeType: mergedUpload.mimeType,
    actorUserId: actor.id,
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
        storageProvider: StorageProvider.Supabase,
        fileName: mergedUpload.fileName,
        mimeType: mergedUpload.mimeType,
        fileSizeBytes: mergedUpload.fileSizeBytes,
        storageBucket: mergedUpload.bucket,
        storagePath: mergedUpload.path,
        googleDriveFileId: driveUpload?.fileId ?? null,
        googleDriveFolderId: driveUpload?.folderId ?? null,
        checksum: mergedUpload.checksum,
        uploadedByUserId: actor.id,
      },
    })

    await tx.generatedDocument.create({
      data: {
        documentRevisionId: revision.id,
        kind: GeneratedDocumentKind.MERGED_PDF,
        fileName: mergedUpload.fileName,
        storageProvider: StorageProvider.Supabase,
        storageBucket: mergedUpload.bucket,
        storagePath: mergedUpload.path,
        googleDriveFileId: driveUpload?.fileId ?? null,
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
