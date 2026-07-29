import "server-only"
import { hashVerificationCode } from "@dtg/verification-domain"
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
    throw new Error("Internal verification access is denied.")
  }
}

export async function getInternalVerification(
  actor: CurrentAppUser,
  rawCode: string
) {
  const code = await prisma.verificationCode.findUnique({
    where: { codeHash: hashVerificationCode(rawCode) },
  })
  if (!code) return null
  const manifest = await prisma.packageManifest.findUnique({
    where: { id: code.manifestId },
    include: {
      hashes: true,
      items: true,
      revision: {
        include: {
          document: { include: { project: { include: { client: true } } } },
        },
      },
    },
  })
  if (!manifest) return null
  assertProjectAccess(actor, manifest.revision.document.projectId)
  const cycles = await prisma.approvalCycle.findMany({
    where: { revisionId: manifest.revisionId },
    include: { steps: true },
    orderBy: { cycleNumber: "desc" },
  })
  const [approvals, responses, files, seals, audits] = await Promise.all([
    prisma.approvalEvidence.findMany({
      where: { approvalCycleId: { in: cycles.map((cycle) => cycle.id) } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.clientResponse.findMany({
      where: { revisionId: manifest.revisionId },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.controlledMainFile.findMany({
      where: { revisionId: manifest.revisionId },
      include: { fileObject: true },
      orderBy: { controlledAt: "desc" },
    }),
    prisma.platformSeal.findMany({
      where: { manifestId: manifest.id },
      orderBy: { sealedAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: {
        projectId: manifest.revision.document.projectId,
        OR: [
          { entityId: manifest.id },
          { entityId: manifest.revisionId },
          { entityId: code.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ])
  return { code, manifest, cycles, approvals, responses, files, seals, audits }
}
