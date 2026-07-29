import "server-only"
import { randomUUID } from "node:crypto"
import { PDFDocument } from "pdf-lib"
import {
  CONTROLLED_PDF_MIME,
  opaqueControlledFileName,
  permissionFingerprint,
  sha256,
  unauthorizedPermissions,
  validatePickerMetadata,
  type DriveStorageAdapter,
} from "@dtg/controlled-storage-domain"
import { IntegrityStatus, JobState } from "@prisma/client"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { env } from "@/lib/config/env"
import { prisma } from "@/lib/prisma/client"
import { hashOpaqueToken, issueOpaqueToken } from "@dtg/identity-domain"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { storageProviderForArea } from "@/server/services/storage/storage-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

function assertDriveManager(actor: CurrentAppUser, projectId: string) {
  if (
    !hasAnyPermission({
      required: [PERMISSIONS.driveManage, PERMISSIONS.dcCheck],
      systemRoles: actor.userRoles.map(({ role }) => role.code),
      projectRoles: actor.projectRoles
        .filter((role) => role.projectId === projectId)
        .map(({ role }) => role.code),
    })
  ) {
    throw new Error("Controlled Drive access is not authorized.")
  }
}

export async function beginPickerSelection(
  actor: CurrentAppUser,
  projectId: string
) {
  assertDriveManager(actor, projectId)
  const nonce = issueOpaqueToken()
  const expiresAt = new Date(Date.now() + 10 * 60_000)
  await prisma.pickerSelectionHandoff.create({
    data: {
      userId: actor.id,
      projectId,
      nonceHash: hashOpaqueToken(nonce),
      expiresAt,
    },
  })
  return { nonce, expiresAt }
}

export async function reserveControlledMainFile(input: {
  actor: CurrentAppUser
  revisionId: string
  rawNonce: string
  selectedFileId: string
  adapter: DriveStorageAdapter
}) {
  const revision = await prisma.documentRevision.findUnique({
    where: { id: input.revisionId },
    include: { document: true, approvalCycles: true },
  })
  if (!revision || revision.deletedAt)
    throw new Error("Revision was not found.")
  assertDriveManager(input.actor, revision.document.projectId)
  if (revision.lockedAt || revision.approvalCycles.length > 0) {
    throw new Error("Controlled content cannot change after approval starts.")
  }
  const nonceHash = hashOpaqueToken(input.rawNonce)
  const handoff = await prisma.pickerSelectionHandoff.findUnique({
    where: { nonceHash },
  })
  if (
    !handoff ||
    handoff.userId !== input.actor.id ||
    handoff.projectId !== revision.document.projectId ||
    handoff.consumedAt ||
    handoff.expiresAt <= new Date()
  ) {
    throw new Error("Drive Picker handoff is invalid or expired.")
  }
  const metadata = validatePickerMetadata(
    await input.adapter.getMetadata(input.selectedFileId),
    {
      allowedDriveIds: env.GOOGLE_DRIVE_SHARED_DRIVE_ID
        ? [env.GOOGLE_DRIVE_SHARED_DRIVE_ID]
        : [],
      maxSizeBytes: env.FILE_UPLOAD_MAX_MB * 1024 * 1024,
    }
  )
  if (metadata.fileId !== input.selectedFileId) {
    throw new Error("Drive Picker metadata identity mismatch.")
  }

  return prisma.$transaction(async (tx) => {
    const consumed = await tx.pickerSelectionHandoff.updateMany({
      where: {
        id: handoff.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        consumedAt: new Date(),
        selectedFileIdHash: hashOpaqueToken(metadata.fileId),
      },
    })
    if (consumed.count !== 1) throw new Error("Picker handoff was consumed.")
    const reservationId = randomUUID()
    const fileObject = await tx.fileObject.create({
      data: {
        storageProvider: storageProviderForArea("temporary"),
        providerKey: `controlled-reservation:${reservationId}`,
        fileName: metadata.name,
        mimeType: metadata.mimeType,
        sizeBytes: BigInt(metadata.sizeBytes),
        checksum: "pending",
      },
    })
    const job = await tx.backgroundJob.create({
      data: {
        jobType: "DRIVE_CONTROLLED_COPY",
        idempotencyKey: `controlled-copy:${reservationId}`,
        payload: {
          fileObjectId: fileObject.id,
          sourceFileId: metadata.fileId,
          sourceDriveId: metadata.driveId ?? null,
          revisionId: revision.id,
        },
        correlationId: reservationId,
      },
    })
    const controlled = await tx.controlledMainFile.create({
      data: {
        revisionId: revision.id,
        fileObjectId: fileObject.id,
        sourceDriveId: metadata.driveId,
        sourceFileId: metadata.fileId,
        copyJobId: job.id,
        opaqueFileName: opaqueControlledFileName("pdf"),
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: input.actor.id,
        projectId: revision.document.projectId,
        action: "controlled_drive.copy_reserved",
        entityType: "ControlledMainFile",
        entityId: controlled.id,
        afterSnapshot: {
          sourceFileFingerprint: hashOpaqueToken(metadata.fileId),
          sourceDriveFingerprint: metadata.driveId
            ? hashOpaqueToken(metadata.driveId)
            : null,
        },
      },
    })
    return { controlledMainFileId: controlled.id, jobId: job.id }
  })
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

export async function processControlledCopyJob(
  jobId: string,
  adapter: DriveStorageAdapter
) {
  const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } })
  if (!job || job.jobType !== "DRIVE_CONTROLLED_COPY") {
    throw new Error("Controlled copy job was not found.")
  }
  const payload = job.payload as {
    fileObjectId: string
    sourceFileId: string
    sourceDriveId?: string | null
    revisionId: string
  }
  const controlled = await prisma.controlledMainFile.findUnique({
    where: { fileObjectId: payload.fileObjectId },
    include: { fileObject: true, revision: { include: { document: true } } },
  })
  if (!controlled) throw new Error("Controlled file reservation is missing.")
  if (controlled.integrityStatus === IntegrityStatus.Verified) return controlled
  if (!env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    throw new Error("Controlled Drive root folder is not configured.")
  }

  const claimed = await prisma.backgroundJob.updateMany({
    where: {
      id: job.id,
      state: { in: [JobState.Pending, JobState.Failed] },
    },
    data: {
      state: JobState.Running,
      attemptCount: { increment: 1 },
      leaseOwner: "controlled-drive-worker",
      leaseExpiresAt: new Date(Date.now() + 10 * 60_000),
    },
  })
  if (claimed.count !== 1 && job.state !== JobState.Running) {
    throw new Error("Controlled copy job cannot be claimed.")
  }

  try {
    const source = validatePickerMetadata(
      await adapter.getMetadata(payload.sourceFileId),
      {
        allowedDriveIds: payload.sourceDriveId ? [payload.sourceDriveId] : [],
        maxSizeBytes: env.FILE_UPLOAD_MAX_MB * 1024 * 1024,
      }
    )
    const copied = await adapter.copy({
      sourceFileId: source.fileId,
      destinationFolderId: env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
      opaqueName: controlled.opaqueFileName ?? opaqueControlledFileName("pdf"),
    })
    const bytes = await streamToBuffer(await adapter.read(copied.fileId))
    const checksum = sha256(bytes)
    if (bytes.length !== copied.sizeBytes) {
      throw new Error("Controlled copy size verification failed.")
    }
    const pdf = await PDFDocument.load(bytes)
    const allowedPrincipals = [
      env.GOOGLE_DRIVE_CLIENT_EMAIL,
      env.GOOGLE_ADMIN_EMAIL,
    ].filter((value): value is string => Boolean(value))
    await adapter.applyRestrictedPermissions(copied.fileId, allowedPrincipals)
    const permissions = await adapter.listPermissions(copied.fileId)
    const unauthorized = unauthorizedPermissions(
      permissions,
      allowedPrincipals.map((email) => email.toLowerCase())
    )
    for (const permission of unauthorized) {
      await adapter.removePermission(copied.fileId, permission.id)
    }
    const finalPermissions = await adapter.listPermissions(copied.fileId)

    return prisma.$transaction(async (tx) => {
      await tx.fileObject.update({
        where: { id: controlled.fileObjectId },
        data: {
          storageProvider: storageProviderForArea("controlled"),
          providerKey: copied.fileId,
          fileName: source.name,
          mimeType: CONTROLLED_PDF_MIME,
          sizeBytes: BigInt(bytes.length),
          checksum,
          pageCount: pdf.getPageCount(),
        },
      })
      await tx.driveFileIdentity.create({
        data: {
          fileObjectId: controlled.fileObjectId,
          driveFileId: copied.fileId,
          sharedDriveId: copied.driveId,
          parentFolderId: copied.parents[0],
          nameSnapshot: copied.name,
          modifiedTime: copied.modifiedTime,
          permissionsHash: permissionFingerprint(finalPermissions),
          metadataSnapshot: {
            mimeType: copied.mimeType,
            sizeBytes: copied.sizeBytes,
          },
        },
      })
      const verified = await tx.controlledMainFile.update({
        where: { id: controlled.id },
        data: {
          integrityStatus: IntegrityStatus.Verified,
          verifiedAt: new Date(),
        },
      })
      await tx.fileIntegrityCheck.create({
        data: {
          fileObjectId: controlled.fileObjectId,
          status: IntegrityStatus.Verified,
          expectedHash: checksum,
          observedHash: checksum,
        },
      })
      await tx.backgroundJob.update({
        where: { id: job.id },
        data: {
          state: JobState.Completed,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      })
      await tx.outboxEvent.create({
        data: {
          eventType: "controlled_file.verified",
          aggregateType: "ControlledMainFile",
          aggregateId: controlled.id,
          payload: {
            fileObjectId: controlled.fileObjectId,
            checksum,
          },
        },
      })
      await tx.auditLog.create({
        data: {
          projectId: controlled.revision.document.projectId,
          action: "controlled_drive.copy_verified",
          entityType: "ControlledMainFile",
          entityId: controlled.id,
          afterSnapshot: {
            fileObjectId: controlled.fileObjectId,
            checksum,
            pageCount: pdf.getPageCount(),
          },
        },
      })
      return verified
    })
  } catch (error) {
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        state: JobState.Failed,
        nextAttemptAt: new Date(Date.now() + 60_000),
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    })
    throw error
  }
}
