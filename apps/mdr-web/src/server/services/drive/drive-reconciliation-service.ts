import "server-only"
import {
  permissionFingerprint,
  sha256,
  unauthorizedPermissions,
  type DriveStorageAdapter,
} from "@dtg/controlled-storage-domain"
import { IntegrityStatus, type Prisma } from "@prisma/client"
import { env } from "@/lib/config/env"
import { prisma } from "@/lib/prisma/client"

async function readAll(adapter: DriveStorageAdapter, fileId: string) {
  const chunks: Buffer[] = []
  for await (const chunk of await adapter.read(fileId)) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function reconcileControlledDrive(
  adapter: DriveStorageAdapter,
  input: { fileObjectIds?: string[] } = {}
) {
  const run = await prisma.reconciliationRun.create({
    data: { scope: "CONTROLLED_DRIVE", status: "Running" },
  })
  const files = await prisma.fileObject.findMany({
    where: {
      id: input.fileObjectIds ? { in: input.fileObjectIds } : undefined,
      controlledMainFiles: { some: { isActive: true } },
      deletedAt: null,
    },
    include: { driveIdentity: true, controlledMainFiles: true },
  })
  let mismatches = 0
  const allowedPrincipals = [
    env.GOOGLE_DRIVE_CLIENT_EMAIL,
    env.GOOGLE_ADMIN_EMAIL,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase())

  for (const file of files) {
    const identity = file.driveIdentity
    const metadata = identity
      ? await adapter.getMetadata(identity.driveFileId)
      : null
    let status: IntegrityStatus = IntegrityStatus.Verified
    let issueType: string | null = null
    let observedHash: string | null = null
    let details: Prisma.InputJsonObject = {}

    if (!metadata) {
      status = IntegrityStatus.Missing
      issueType = "MISSING_CONTROLLED_FILE"
    } else if (metadata.trashed) {
      status = IntegrityStatus.Trashed
      issueType = "MISSING_CONTROLLED_FILE"
      details = { trashed: true }
    } else {
      const permissions = await adapter.listPermissions(metadata.fileId)
      const drift = unauthorizedPermissions(permissions, allowedPrincipals)
      if (drift.length > 0) {
        for (const permission of drift) {
          await adapter.removePermission(metadata.fileId, permission.id)
        }
        status = IntegrityStatus.PermissionDrift
        issueType = "PERMISSION_DRIFT"
        details = {
          unauthorizedPermissionCount: drift.length,
          unauthorizedPermissionsRemoved: true,
        }
      } else if (metadata.sizeBytes !== Number(file.sizeBytes)) {
        status = IntegrityStatus.TamperDetected
        issueType = "TAMPER_DETECTED"
        details = {
          expectedSize: Number(file.sizeBytes),
          observedSize: metadata.sizeBytes,
        }
      } else {
        observedHash = sha256(await readAll(adapter, metadata.fileId))
        if (observedHash !== file.checksum) {
          status = IntegrityStatus.TamperDetected
          issueType = "TAMPER_DETECTED"
        }
      }
      const reconciledPermissions =
        drift.length > 0
          ? await adapter.listPermissions(metadata.fileId)
          : permissions
      await prisma.driveFileIdentity.update({
        where: { id: identity!.id },
        data: {
          nameSnapshot: metadata.name,
          parentFolderId: metadata.parents[0],
          modifiedTime: metadata.modifiedTime,
          trashed: metadata.trashed,
          permissionsHash: permissionFingerprint(reconciledPermissions),
          lastReconciledAt: new Date(),
        },
      })
    }

    await prisma.fileIntegrityCheck.create({
      data: {
        fileObjectId: file.id,
        status,
        expectedHash: file.checksum,
        observedHash,
        details,
      },
    })
    await prisma.controlledMainFile.updateMany({
      where: { fileObjectId: file.id, isActive: true },
      data: { integrityStatus: status },
    })
    if (issueType) {
      mismatches += 1
      await prisma.controlledStorageIssue.create({
        data: {
          reconciliationRunId: run.id,
          fileObjectId: file.id,
          issueType,
          severity: "Security",
          details,
        },
      })
      await prisma.outboxEvent.create({
        data: {
          eventType: "controlled_storage.security_alert",
          aggregateType: "FileObject",
          aggregateId: file.id,
          payload: { issueType },
        },
      })
    }
  }

  return prisma.reconciliationRun.update({
    where: { id: run.id },
    data: {
      status: "Completed",
      checkedCount: files.length,
      mismatchCount: mismatches,
      completedAt: new Date(),
    },
  })
}
