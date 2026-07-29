import "server-only"
import { issueUnpredictableVerificationCode } from "@dtg/verification-domain"
import { prisma } from "@/lib/prisma/client"
import { ROLE_CODES } from "@/lib/permissions/rbac"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

function assertProjectAccess(actor: CurrentAppUser, projectId: string) {
  const privileged = new Set<string>([
    ROLE_CODES.superAdmin,
    ROLE_CODES.systemAdmin,
    ROLE_CODES.documentControlAdmin,
  ])
  if (
    !actor.userRoles.some(({ role }) => privileged.has(role.code)) &&
    !actor.projectRoles.some((assignment) => assignment.projectId === projectId)
  ) {
    throw new Error("Verification-code access is denied.")
  }
}

export async function issueManifestVerificationCode(
  actor: CurrentAppUser,
  input: {
    manifestId: string
    targetType?:
      | "CONTROLLED_MAIN"
      | "PACKAGE_MANIFEST"
      | "INTERNAL_APPROVAL"
      | "PLATFORM_SEAL"
      | "CLIENT_RESPONSE_FILE"
      | "GENERATED_ARTIFACT"
    targetId?: string
    publicLabel?: string
    expiresAt?: Date
  }
) {
  const manifest = await prisma.packageManifest.findUnique({
    where: { id: input.manifestId },
    include: { revision: { include: { document: true } } },
  })
  if (!manifest) throw new Error("The package manifest was not found.")
  assertProjectAccess(actor, manifest.revision.document.projectId)
  const issued = issueUnpredictableVerificationCode()
  const record = await prisma.verificationCode.create({
    data: {
      manifestId: manifest.id,
      codeHash: issued.codeHash,
      targetType: input.targetType ?? "PACKAGE_MANIFEST",
      targetId: input.targetId,
      publicLabel: input.publicLabel,
      sealTransactionId: (
        await prisma.platformSeal.findFirst({
          where: { manifestId: manifest.id },
          orderBy: { sealedAt: "desc" },
        })
      )?.id,
      expiresAt: input.expiresAt,
    },
  })
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "verification.code_issued",
      entityType: "VerificationCode",
      entityId: record.id,
      projectId: manifest.revision.document.projectId,
      relevantHashes: { codeHash: issued.codeHash },
      afterSnapshot: {
        targetType: record.targetType,
        targetId: record.targetId,
        expiresAt: record.expiresAt?.toISOString() ?? null,
      },
    },
  })
  return {
    code: issued.code,
    qrUrl: `https://verify.dtgapps.cc/?code=${encodeURIComponent(issued.code)}`,
    documentNumber: manifest.revision.document.dtgsaDocumentNumber,
    revision: manifest.revision.revisionLabel,
    packageReference: manifest.manifestDigest,
    sealTransactionId: record.sealTransactionId,
  }
}

export async function revokeVerificationCode(
  actor: CurrentAppUser,
  codeId: string
) {
  const record = await prisma.verificationCode.findUnique({
    where: { id: codeId },
  })
  if (!record) throw new Error("The verification code was not found.")
  const manifest = await prisma.packageManifest.findUniqueOrThrow({
    where: { id: record.manifestId },
    include: { revision: { include: { document: true } } },
  })
  assertProjectAccess(actor, manifest.revision.document.projectId)
  return prisma.verificationCode.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  })
}
