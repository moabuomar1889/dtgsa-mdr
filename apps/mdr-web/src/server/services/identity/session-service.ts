import "server-only"
import { cookies } from "next/headers"
import {
  assertSessionActive,
  hashOpaqueToken,
  issueOpaqueToken,
  type AuthMode,
} from "@dtg/identity-domain"
import { prisma } from "@/lib/prisma/client"
import { getIdentityConfig } from "./identity-config"

export const INTERNAL_SESSION_COOKIE = "dtg_internal_session"
export const INTERNAL_CSRF_COOKIE = "dtg_internal_csrf"

const internalUserInclude = {
  signatureProfile: true,
  userRoles: {
    include: {
      role: true,
    },
  },
  projectRoles: {
    include: {
      role: true,
      project: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
} as const

export function internalSessionCookieOptions(expiresAt: Date) {
  const config = getIdentityConfig()
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    domain: envCookieDomain(config),
  }
}

export function internalCsrfCookieOptions(expiresAt: Date) {
  const config = getIdentityConfig()
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    expires: expiresAt,
    domain: envCookieDomain(config),
  }
}

function envCookieDomain(_config: ReturnType<typeof getIdentityConfig>) {
  return _config.authCookieDomain?.trim() || undefined
}

export async function createInternalSession(input: {
  userId: string
  authMode: AuthMode
  authenticatedAt?: Date
  currentToken?: string | null
  ipHash?: string | null
  userAgentHash?: string | null
}) {
  const config = getIdentityConfig()
  const rawToken = issueOpaqueToken()
  const csrfToken = issueOpaqueToken()
  const authenticatedAt = input.authenticatedAt ?? new Date()
  const expiresAt = new Date(
    authenticatedAt.getTime() + config.internalSessionTtlMinutes * 60_000
  )
  const currentTokenHash = input.currentToken
    ? hashOpaqueToken(input.currentToken)
    : null

  const session = await prisma.$transaction(async (tx) => {
    const currentSession = currentTokenHash
      ? await tx.internalAuthSession.findUnique({
          where: { tokenHash: currentTokenHash },
        })
      : null

    if (currentSession && !currentSession.revokedAt) {
      await tx.internalAuthSession.update({
        where: { id: currentSession.id },
        data: { revokedAt: authenticatedAt },
      })
    }

    const created = await tx.internalAuthSession.create({
      data: {
        userId: input.userId,
        tokenHash: hashOpaqueToken(rawToken),
        csrfTokenHash: hashOpaqueToken(csrfToken),
        authMode: input.authMode,
        authenticatedAt,
        expiresAt,
        rotatedFromId: currentSession?.id,
        ipHash: input.ipHash,
        userAgentHash: input.userAgentHash,
      },
    })

    await tx.recentAuthenticationEvidence.create({
      data: {
        userId: input.userId,
        internalSessionId: created.id,
        provider: "google_workspace",
        method: "oidc_authorization_code",
        authenticatedAt,
        expiresAt: new Date(
          authenticatedAt.getTime() + config.recentAuthWindowMinutes * 60_000
        ),
        sessionHash: created.tokenHash,
      },
    })

    await tx.auditLog.create({
      data: {
        actorUserId: input.userId,
        action: "identity.internal.login",
        entityType: "InternalAuthSession",
        entityId: created.id,
        afterSnapshot: {
          authMode: input.authMode,
          expiresAt: expiresAt.toISOString(),
        },
      },
    })

    return created
  })

  return { session, rawToken, csrfToken, expiresAt }
}

export async function getInternalSessionByToken(rawToken: string) {
  const tokenHash = hashOpaqueToken(rawToken)
  const session = await prisma.internalAuthSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: internalUserInclude,
      },
    },
  })

  if (!session) return null
  try {
    assertSessionActive(session)
  } catch {
    return null
  }
  if (!session.user.isActive || session.user.deletedAt) {
    return null
  }
  return session
}

export async function getCurrentInternalSession() {
  const cookieStore = await cookies()
  const rawToken = cookieStore.get(INTERNAL_SESSION_COOKIE)?.value
  return rawToken ? getInternalSessionByToken(rawToken) : null
}

export async function assertInternalCsrf(
  rawSessionToken: string,
  rawCsrfToken: string
) {
  const session = await prisma.internalAuthSession.findUnique({
    where: { tokenHash: hashOpaqueToken(rawSessionToken) },
    select: {
      csrfTokenHash: true,
      expiresAt: true,
      revokedAt: true,
    },
  })
  if (!session) throw new Error("Internal session is invalid.")
  assertSessionActive(session)
  if (session.csrfTokenHash !== hashOpaqueToken(rawCsrfToken)) {
    throw new Error("CSRF validation failed.")
  }
}

export async function revokeInternalSession(
  rawToken: string | null | undefined
) {
  if (!rawToken) return
  const tokenHash = hashOpaqueToken(rawToken)
  const session = await prisma.internalAuthSession.findUnique({
    where: { tokenHash },
  })
  if (!session || session.revokedAt) return

  const revokedAt = new Date()
  await prisma.$transaction([
    prisma.internalAuthSession.update({
      where: { id: session.id },
      data: { revokedAt },
    }),
    prisma.recentAuthenticationEvidence.updateMany({
      where: {
        internalSessionId: session.id,
        revokedAt: null,
      },
      data: { revokedAt },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: "identity.internal.logout",
        entityType: "InternalAuthSession",
        entityId: session.id,
        afterSnapshot: { revokedAt: revokedAt.toISOString() },
      },
    }),
  ])
}

export async function revokeAllUserSessions(userId: string, reason: string) {
  const revokedAt = new Date()
  const active = await prisma.internalAuthSession.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: revokedAt },
    },
    select: { id: true },
  })
  if (active.length === 0) return 0

  await prisma.$transaction([
    prisma.internalAuthSession.updateMany({
      where: { id: { in: active.map((session) => session.id) } },
      data: { revokedAt },
    }),
    prisma.recentAuthenticationEvidence.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "identity.internal.sessions.revoked",
        entityType: "User",
        entityId: userId,
        afterSnapshot: {
          reason,
          revokedSessionCount: active.length,
        },
      },
    }),
  ])
  return active.length
}
