import "server-only"
import {
  AuditSeverity,
  DriveFolderType,
  DocumentFileType,
  StorageProvider,
  WorkflowActionType,
  WorkflowStatus,
} from "@prisma/client"
import { z } from "zod"
import { env } from "@/lib/config/env"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { uploadProjectFileToGoogleDrive } from "@/server/services/drive/project-drive-service"
import {
  buildStoragePath,
  uploadFileToSupabaseStorage,
} from "@/server/services/storage/storage-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const uploadRevisionFileSchema = z.object({
  revisionId: z.string().trim().min(1),
})

function isFileLike(value: unknown): value is File {
  return value instanceof File && value.size > 0
}

function canUploadForProject(user: CurrentAppUser, projectId: string) {
  return hasAnyPermission({
    required: [
      PERMISSIONS.workflowPrepare,
      PERMISSIONS.mdrManage,
      PERMISSIONS.dcCheck,
    ],
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: user.projectRoles
      .filter((item) => item.projectId === projectId)
      .map((item) => item.role.code),
  })
}

function resolveUploadLimitMb(input: {
  projectOverrideMb?: number | null
  clientDefaultMb?: number | null
}) {
  return (
    input.projectOverrideMb ??
    input.clientDefaultMb ??
    env.FILE_UPLOAD_MAX_MB
  )
}

export async function uploadRevisionFile(
  actor: CurrentAppUser,
  input: {
    revisionId: unknown
    file: unknown
  }
) {
  const parsed = uploadRevisionFileSchema.parse({
    revisionId: input.revisionId,
  })
  const file = isFileLike(input.file) ? input.file : null

  if (!file) {
    throw new Error("A file is required.")
  }

  const revision = await prisma.documentRevision.findUnique({
    where: {
      id: parsed.revisionId,
    },
    include: {
      document: {
        include: {
          project: {
            include: {
              setting: true,
              client: {
                include: {
                  setting: true,
                },
              },
            },
          },
        },
      },
      files: {
        where: {
          deletedAt: null,
        },
      },
    },
  })

  if (!revision || revision.deletedAt) {
    throw new Error("The selected revision could not be found.")
  }

  if (!canUploadForProject(actor, revision.document.projectId)) {
    throw new Error("You do not have permission to upload files for this revision.")
  }

  const maxUploadMb = resolveUploadLimitMb({
    projectOverrideMb: revision.document.project.setting?.uploadMaxMbOverride,
    clientDefaultMb: revision.document.project.client.setting?.defaultUploadMaxMb,
  })

  if (file.size > maxUploadMb * 1024 * 1024) {
    throw new Error(
      `The file exceeds the configured upload limit of ${maxUploadMb} MB.`
    )
  }

  const documentFileType =
    revision.revisionIndex > 0 ? DocumentFileType.REVISION_SOURCE : DocumentFileType.SOURCE

  const storagePath = buildStoragePath(
    "projects",
    revision.document.project.code,
    revision.document.dtgsaDocumentNumber,
    `rev-${revision.revisionLabel}`,
    documentFileType.toLowerCase(),
    file.name
  )

  const uploaded = await uploadFileToSupabaseStorage({
    bucket: env.SUPABASE_STORAGE_BUCKET_SOURCE,
    path: storagePath,
    file,
    upsert: true,
  })

  const driveUpload = await uploadProjectFileToGoogleDrive({
    projectId: revision.document.projectId,
    folderType:
      revision.revisionIndex > 0 ? DriveFolderType.REVISIONS : DriveFolderType.MDR,
    fileName: file.name,
    bytes: Buffer.from(await file.arrayBuffer()),
    mimeType: uploaded.mimeType,
    actorUserId: actor.id,
  })

  return prisma.$transaction(async (tx) => {
    const documentFile = await tx.documentFile.create({
      data: {
        documentRevisionId: revision.id,
        projectId: revision.document.projectId,
        type: documentFileType,
        storageProvider: StorageProvider.Supabase,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        fileSizeBytes: uploaded.fileSizeBytes,
        storageBucket: uploaded.bucket,
        storagePath: uploaded.path,
        googleDriveFileId: driveUpload?.fileId ?? null,
        googleDriveFolderId: driveUpload?.folderId ?? null,
        checksum: uploaded.checksum,
        uploadedByUserId: actor.id,
      },
    })

    if (revision.workflowStatus === WorkflowStatus.Draft) {
      await tx.documentRevision.update({
        where: {
          id: revision.id,
        },
        data: {
          workflowStatus: WorkflowStatus.Uploaded,
        },
      })

      await tx.mdrDocument.update({
        where: {
          id: revision.documentId,
        },
        data: {
          currentWorkflowStatus: WorkflowStatus.Uploaded,
        },
      })

      await tx.workflowAction.create({
        data: {
          documentRevisionId: revision.id,
          actionType: WorkflowActionType.Uploaded,
          actorUserId: actor.id,
          fromStatus: WorkflowStatus.Draft,
          toStatus: WorkflowStatus.Uploaded,
          comments: `Uploaded ${file.name}.`,
        },
      })
    }

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "document_file.upload",
        entityType: "DocumentFile",
        entityId: documentFile.id,
        projectId: revision.document.projectId,
        clientId: revision.document.project.clientId,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          documentRevisionId: revision.id,
          documentFileType,
          fileName: documentFile.fileName,
          fileSizeBytes: documentFile.fileSizeBytes,
          googleDriveFileId: documentFile.googleDriveFileId,
        },
      },
    })

    return documentFile
  })
}
