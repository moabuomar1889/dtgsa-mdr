import "server-only"
import { IntegrityStatus, JobState } from "@prisma/client"
import { createArtifactCacheKey } from "@dtg/job-engine"
import { ROLE_CODES } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

function assertProjectAccess(actor: CurrentAppUser, projectId: string) {
  const privileged = new Set<string>([
    ROLE_CODES.superAdmin,
    ROLE_CODES.systemAdmin,
    ROLE_CODES.documentControlAdmin,
  ])
  const hasSystemAccess = actor.userRoles.some(({ role }) =>
    privileged.has(role.code)
  )
  const hasProjectAccess = actor.projectRoles.some(
    (assignment) => assignment.projectId === projectId
  )
  if (!hasSystemAccess && !hasProjectAccess) {
    throw new Error("Cross-project download access is denied.")
  }
}

export async function requestSignedInternalDownload(
  actor: CurrentAppUser,
  revisionId: string
) {
  const revision = await prisma.documentRevision.findUnique({
    where: { id: revisionId },
    include: {
      document: {
        select: {
          projectId: true,
          project: { select: { clientId: true } },
        },
      },
      controlledMainFiles: {
        where: { isActive: true },
        include: { fileObject: true },
        orderBy: { controlledAt: "desc" },
        take: 1,
      },
      packageManifests: {
        where: { invalidatedAt: null },
        include: { hashes: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })
  if (!revision || revision.deletedAt) {
    throw new Error("The selected revision could not be found.")
  }
  assertProjectAccess(actor, revision.document.projectId)

  const controlledMain = revision.controlledMainFiles[0]
  if (
    !controlledMain ||
    controlledMain.integrityStatus !== IntegrityStatus.Verified
  ) {
    throw new Error(
      "Signed Internally download is blocked until the controlled Main PDF passes integrity verification."
    )
  }
  const cover = await prisma.generatedCover.findFirst({
    where: { revisionId },
    orderBy: { generatedAt: "desc" },
  })
  if (!cover || !cover.outputHash) {
    throw new Error("A signed and sealed cover must be generated first.")
  }
  const manifest = revision.packageManifests[0]
  const packageHash = manifest?.hashes.find(
    (hash) => hash.algorithm.toUpperCase() === "SHA-256"
  )?.value
  if (!manifest || !packageHash) {
    throw new Error("A current package manifest and SHA-256 hash are required.")
  }
  const attachments = await prisma.controlledAttachment.findMany({
    where: { revisionId },
    orderBy: { createdAt: "asc" },
  })
  const profile = {
    kind: "SIGNED_INTERNALLY",
    coverFileObjectId: cover.fileObjectId,
    mainFileObjectId: controlledMain.fileObjectId,
    attachmentFileObjectIds: attachments.map((item) => item.fileObjectId),
  }
  const cacheKey = createArtifactCacheKey(packageHash, profile)
  const cached = await prisma.generatedArtifactRecord.findUnique({
    where: { cacheKey },
  })
  if (
    cached &&
    cached.cleanupStatus === "Available" &&
    cached.expiresAt &&
    cached.expiresAt > new Date()
  ) {
    return { status: "cached" as const, artifactId: cached.id }
  }

  const idempotencyKey = `pdf-internal:${cacheKey}`
  return prisma.$transaction(async (tx) => {
    const existing = await tx.backgroundJob.findUnique({
      where: { idempotencyKey },
    })
    if (
      existing &&
      (existing.state === JobState.Pending ||
        existing.state === JobState.Running)
    ) {
      return { status: "queued" as const, jobId: existing.id }
    }
    const job = await tx.backgroundJob.upsert({
      where: { idempotencyKey },
      create: {
        jobType: "PDF_ASSEMBLE_INTERNAL",
        idempotencyKey,
        correlationId: `revision:${revision.id}:signed-internal`,
        priority: 30,
        maxAttempts: 4,
        payload: {
          revisionId: revision.id,
          requesterUserId: actor.id,
          projectId: revision.document.projectId,
          clientId: revision.document.project.clientId,
          manifestId: manifest.id,
          packageHash,
          cacheKey,
          profile,
          expectedMainHash: controlledMain.fileObject.checksum,
          expiresInSeconds: 3600,
        },
      },
      update: {
        state: JobState.Pending,
        attemptCount: 0,
        nextAttemptAt: new Date(),
        lastError: undefined,
        deadLetteredAt: null,
      },
    })
    await tx.outboxEvent.create({
      data: {
        eventType: "artifact.signed_internal_requested",
        aggregateType: "DocumentRevision",
        aggregateId: revision.id,
        correlationId: job.correlationId,
        payload: { jobId: job.id, cacheKey },
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "artifact.signed_internal_requested",
        entityType: "DocumentRevision",
        entityId: revision.id,
        projectId: revision.document.projectId,
        clientId: revision.document.project.clientId,
        correlationId: job.correlationId,
        relevantHashes: {
          packageHash,
          expectedMainHash: controlledMain.fileObject.checksum,
        },
        afterSnapshot: {
          jobId: job.id,
          profile,
          expiresInSeconds: 3600,
        },
      },
    })
    return { status: "queued" as const, jobId: job.id }
  })
}
