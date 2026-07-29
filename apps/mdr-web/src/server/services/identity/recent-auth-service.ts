import "server-only"
import { assertRecentAuthentication } from "@dtg/identity-domain"
import { prisma } from "@/lib/prisma/client"
import { getCurrentInternalSession } from "./session-service"

export async function requireRecentAuthenticationForSigning(input: {
  userId: string
  consumeOnce?: boolean
}) {
  const session = await getCurrentInternalSession()
  if (!session || session.userId !== input.userId) {
    throw new Error("A valid internal session is required for signing.")
  }
  const evidence = await prisma.recentAuthenticationEvidence.findFirst({
    where: {
      userId: input.userId,
      internalSessionId: session.id,
      revokedAt: null,
    },
    orderBy: { authenticatedAt: "desc" },
  })
  if (!evidence) {
    throw new Error("Recent Google authentication is required for signing.")
  }
  assertRecentAuthentication(evidence, {
    sessionHash: session.tokenHash,
    consumeOnce: input.consumeOnce,
  })

  if (input.consumeOnce) {
    const consumed = await prisma.recentAuthenticationEvidence.updateMany({
      where: {
        id: evidence.id,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    })
    if (consumed.count !== 1) {
      throw new Error("Recent authentication evidence was already consumed.")
    }
  }
  return evidence
}

export async function assertEmployeeMayApprove(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, deletedAt: true },
  })
  if (!user?.isActive || user.deletedAt) {
    throw new Error("Suspended employees cannot create new approvals.")
  }
  return true
}
