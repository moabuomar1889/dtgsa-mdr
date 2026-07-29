import "server-only"
import {
  parseByteRange,
  secureFileHeaders,
  type DriveStorageAdapter,
} from "@dtg/controlled-storage-domain"
import { IntegrityStatus } from "@prisma/client"
import { ROLE_CODES } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

export async function openControlledFile(input: {
  actor: CurrentAppUser
  fileObjectId: string
  rangeHeader: string | null
  adapter: DriveStorageAdapter
}) {
  const controlled = await prisma.controlledMainFile.findUnique({
    where: { fileObjectId: input.fileObjectId },
    include: {
      fileObject: { include: { driveIdentity: true } },
      revision: { include: { document: true } },
    },
  })
  if (
    !controlled ||
    !controlled.isActive ||
    controlled.integrityStatus !== IntegrityStatus.Verified ||
    !controlled.fileObject.driveIdentity
  ) {
    throw new Error("Controlled file is unavailable or integrity-blocked.")
  }
  const projectRoles = input.actor.projectRoles.filter(
    (role) => role.projectId === controlled.revision.document.projectId
  )
  const privilegedSystemRoles = new Set<string>([
    ROLE_CODES.superAdmin,
    ROLE_CODES.systemAdmin,
    ROLE_CODES.documentControlAdmin,
  ])
  const hasPrivilegedSystemRole = input.actor.userRoles.some(({ role }) =>
    privilegedSystemRoles.has(role.code)
  )
  if (!hasPrivilegedSystemRole && projectRoles.length === 0) {
    throw new Error("Cross-project file access is denied.")
  }
  const sizeBytes = Number(controlled.fileObject.sizeBytes)
  const range = parseByteRange(input.rangeHeader, sizeBytes)
  const stream = await input.adapter.read(
    controlled.fileObject.driveIdentity.driveFileId,
    range ?? undefined
  )
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actor.id,
      projectId: controlled.revision.document.projectId,
      action: range
        ? "controlled_file.range_opened"
        : "controlled_file.downloaded",
      entityType: "FileObject",
      entityId: controlled.fileObject.id,
    },
  })
  return {
    stream,
    status: range ? 206 : 200,
    headers: secureFileHeaders({
      fileName: controlled.fileObject.fileName,
      mimeType: controlled.fileObject.mimeType,
      sizeBytes,
      range,
    }),
  }
}
