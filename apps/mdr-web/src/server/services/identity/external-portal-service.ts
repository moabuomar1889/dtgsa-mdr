import "server-only"
import { cookies } from "next/headers"
import { z } from "zod"
import {
  assertMagicLinkUsable,
  assertSessionActive,
  hashOpaqueToken,
  issueOpaqueToken,
} from "@dtg/identity-domain"
import { PortalTokenUsePolicy } from "@prisma/client"
import { prisma } from "@/lib/prisma/client"
import { env } from "@/lib/config/env"
import { sendEmail } from "@/server/services/email/email-service"
import { getIdentityConfig } from "./identity-config"

export const EXTERNAL_SESSION_COOKIE = "dtg_external_session"
export const EXTERNAL_CSRF_COOKIE = "dtg_external_csrf"

const invitationSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(120),
  clientId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  pdiItemIds: z.array(z.string().min(1)).max(500).default([]),
  usePolicy: z
    .enum([PortalTokenUsePolicy.OneTime, PortalTokenUsePolicy.Reusable])
    .default(PortalTokenUsePolicy.OneTime),
  expiresInMinutes: z.number().int().positive().max(10_080).optional(),
})

export interface PortalInvitationDeliveryAdapter {
  deliver(input: {
    email: string
    fullName: string
    magicLink: string
    expiresAt: Date
  }): Promise<void>
}

export class ConfiguredPortalInvitationDeliveryAdapter implements PortalInvitationDeliveryAdapter {
  async deliver(input: {
    email: string
    fullName: string
    magicLink: string
    expiresAt: Date
  }) {
    await sendEmail({
      to: input.email,
      subject: "DTG client portal access",
      text: [
        `Hello ${input.fullName},`,
        "",
        "Use this secure link to access the DTG client portal:",
        input.magicLink,
        "",
        `The invitation expires at ${input.expiresAt.toISOString()}.`,
      ].join("\n"),
    })
  }
}

export class FakePortalInvitationDeliveryAdapter implements PortalInvitationDeliveryAdapter {
  readonly deliveries: Array<{
    email: string
    fullName: string
    magicLink: string
    expiresAt: Date
  }> = []

  async deliver(input: {
    email: string
    fullName: string
    magicLink: string
    expiresAt: Date
  }) {
    this.deliveries.push(input)
  }
}

function portalSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  }
}

function portalCsrfCookieOptions(expiresAt: Date) {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    expires: expiresAt,
  }
}

export const externalPortalCookieOptions = {
  session: portalSessionCookieOptions,
  csrf: portalCsrfCookieOptions,
}

async function ensureExternalIdentity(input: {
  email: string
  fullName: string
}) {
  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findFirst({
      where: {
        email: { equals: input.email, mode: "insensitive" },
        deletedAt: null,
      },
    })
    if (!user) {
      user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          fullName: input.fullName,
          isActive: true,
        },
      })
    }

    const existing = await tx.userIdentity.findFirst({
      where: {
        userId: user.id,
        provider: "external_magic_link",
        deactivatedAt: null,
      },
      include: { external: true },
    })
    if (existing?.external) return existing.external

    const identity = await tx.userIdentity.create({
      data: {
        userId: user.id,
        provider: "external_magic_link",
        subject: `external:${issueOpaqueToken(24)}`,
        emailAtLink: input.email.toLowerCase(),
      },
    })
    return tx.externalPortalIdentity.create({
      data: { userIdentityId: identity.id },
    })
  })
}

export async function createExternalPortalInvitation(
  actorUserId: string,
  input: unknown,
  deliveryAdapter: PortalInvitationDeliveryAdapter
) {
  const parsed = invitationSchema.parse(input)
  const config = getIdentityConfig()
  const [client, project, scopedItems] = await Promise.all([
    prisma.client.findUnique({ where: { id: parsed.clientId } }),
    parsed.projectId
      ? prisma.project.findFirst({
          where: {
            id: parsed.projectId,
            clientId: parsed.clientId,
            deletedAt: null,
          },
        })
      : null,
    parsed.pdiItemIds.length
      ? prisma.pdiItem.findMany({
          where: {
            id: { in: parsed.pdiItemIds },
            project: {
              clientId: parsed.clientId,
              ...(parsed.projectId ? { id: parsed.projectId } : {}),
            },
            deletedAt: null,
          },
          select: { id: true },
        })
      : [],
  ])
  if (!client || (parsed.projectId && !project)) {
    throw new Error("Invitation scope is not a valid client/project.")
  }
  if (scopedItems.length !== parsed.pdiItemIds.length) {
    throw new Error("One or more scoped PDI items are outside the invitation.")
  }

  const externalIdentity = await ensureExternalIdentity(parsed)
  const rawToken = issueOpaqueToken(48)
  const expiresAt = new Date(
    Date.now() +
      (parsed.expiresInMinutes ?? config.magicLinkTtlMinutes) * 60_000
  )
  const invitation = await prisma.externalPortalInvitation.create({
    data: {
      externalIdentityId: externalIdentity.id,
      clientId: parsed.clientId,
      projectId: parsed.projectId,
      tokenHash: hashOpaqueToken(rawToken),
      usePolicy: parsed.usePolicy,
      expiresAt,
      createdByUserId: actorUserId,
      pdiItems: parsed.pdiItemIds.length
        ? {
            createMany: {
              data: parsed.pdiItemIds.map((pdiItemId) => ({ pdiItemId })),
            },
          }
        : undefined,
    },
  })
  const magicLink = new URL("/api/portal/magic-link", env.NEXT_PUBLIC_APP_URL)
  magicLink.searchParams.set("token", rawToken)

  try {
    await deliveryAdapter.deliver({
      email: parsed.email,
      fullName: parsed.fullName,
      magicLink: magicLink.toString(),
      expiresAt,
    })
  } catch (error) {
    await prisma.externalPortalInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    })
    throw error
  }

  await prisma.auditLog.create({
    data: {
      actorUserId,
      clientId: parsed.clientId,
      projectId: parsed.projectId,
      action: "identity.external.invitation.created",
      entityType: "ExternalPortalInvitation",
      entityId: invitation.id,
      afterSnapshot: {
        usePolicy: parsed.usePolicy,
        expiresAt: expiresAt.toISOString(),
        pdiItemScopeCount: parsed.pdiItemIds.length,
      },
    },
  })
  return invitation
}

async function checkRateLimit(keyHash: string) {
  const now = new Date()
  const existing = await prisma.authenticationRateLimit.findUnique({
    where: {
      scope_keyHash: {
        scope: "external_magic_link",
        keyHash,
      },
    },
  })
  if (existing?.lockedUntil && existing.lockedUntil > now) {
    throw new Error("Magic Link attempts are temporarily rate limited.")
  }
  if (
    !existing ||
    existing.windowStart <= new Date(now.getTime() - 15 * 60_000)
  ) {
    return prisma.authenticationRateLimit.upsert({
      where: {
        scope_keyHash: {
          scope: "external_magic_link",
          keyHash,
        },
      },
      update: {
        attempts: 1,
        windowStart: now,
        lockedUntil: null,
      },
      create: {
        scope: "external_magic_link",
        keyHash,
        attempts: 1,
        windowStart: now,
      },
    })
  }
  const attempts = existing.attempts + 1
  return prisma.authenticationRateLimit.update({
    where: { id: existing.id },
    data: {
      attempts,
      lockedUntil:
        attempts >= 10 ? new Date(now.getTime() + 15 * 60_000) : null,
    },
  })
}

export async function redeemExternalPortalInvitation(input: {
  rawToken: string
  rateLimitKey: string
  ipHash?: string | null
  userAgentHash?: string | null
}) {
  const rateLimitKeyHash = hashOpaqueToken(input.rateLimitKey)
  await checkRateLimit(rateLimitKeyHash)
  const tokenHash = hashOpaqueToken(input.rawToken)
  const invitation = await prisma.externalPortalInvitation.findUnique({
    where: { tokenHash },
    include: {
      identity: {
        include: {
          identity: {
            include: { user: true },
          },
        },
      },
    },
  })
  if (!invitation) {
    throw new Error("Magic Link invitation is invalid.")
  }
  try {
    assertMagicLinkUsable(invitation, input.rawToken)
  } catch (error) {
    await prisma.externalPortalInvitation.update({
      where: { id: invitation.id },
      data: { failedAttempts: { increment: 1 } },
    })
    throw error
  }
  if (!invitation.identity.identity.user.isActive) {
    throw new Error("External portal identity is inactive.")
  }

  const config = getIdentityConfig()
  const rawSessionToken = issueOpaqueToken()
  const csrfToken = issueOpaqueToken()
  const expiresAt = new Date(
    Date.now() + config.externalSessionTtlMinutes * 60_000
  )
  const session = await prisma.$transaction(async (tx) => {
    const consumed = await tx.externalPortalInvitation.updateMany({
      where: {
        id: invitation.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        ...(invitation.usePolicy === PortalTokenUsePolicy.OneTime
          ? { useCount: 0 }
          : {}),
      },
      data: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    })
    if (consumed.count !== 1) {
      throw new Error("Magic Link invitation was already consumed.")
    }

    const created = await tx.externalPortalSession.create({
      data: {
        externalIdentityId: invitation.externalIdentityId,
        invitationId: invitation.id,
        tokenHash: hashOpaqueToken(rawSessionToken),
        csrfTokenHash: hashOpaqueToken(csrfToken),
        clientId: invitation.clientId,
        projectId: invitation.projectId,
        expiresAt,
        ipHash: input.ipHash,
        userAgentHash: input.userAgentHash,
      },
    })
    await tx.externalPortalIdentity.update({
      where: { id: invitation.externalIdentityId },
      data: { lastAuthenticatedAt: new Date() },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: invitation.identity.identity.userId,
        clientId: invitation.clientId,
        projectId: invitation.projectId,
        action: "identity.external.login",
        entityType: "ExternalPortalSession",
        entityId: created.id,
      },
    })
    return created
  })

  return { session, rawSessionToken, csrfToken, expiresAt }
}

export async function getExternalPortalSessionByToken(rawToken: string) {
  const session = await prisma.externalPortalSession.findUnique({
    where: { tokenHash: hashOpaqueToken(rawToken) },
    include: {
      invitation: {
        include: {
          pdiItems: true,
        },
      },
      identity: {
        include: {
          identity: {
            include: { user: true },
          },
        },
      },
    },
  })
  if (!session) return null
  try {
    assertSessionActive(session)
  } catch {
    return null
  }
  if (
    session.invitation.revokedAt ||
    !session.identity.identity.user.isActive
  ) {
    return null
  }
  return session
}

export async function getCurrentExternalPortalSession() {
  const cookieStore = await cookies()
  const rawToken = cookieStore.get(EXTERNAL_SESSION_COOKIE)?.value
  return rawToken ? getExternalPortalSessionByToken(rawToken) : null
}

export async function assertExternalPortalCsrf(input: {
  rawSessionToken: string
  rawCsrfToken: string
}) {
  const session = await prisma.externalPortalSession.findUnique({
    where: { tokenHash: hashOpaqueToken(input.rawSessionToken) },
    select: {
      csrfTokenHash: true,
      expiresAt: true,
      revokedAt: true,
    },
  })
  if (!session) throw new Error("External portal session is invalid.")
  assertSessionActive(session)
  if (session.csrfTokenHash !== hashOpaqueToken(input.rawCsrfToken)) {
    throw new Error("External portal CSRF validation failed.")
  }
}

export async function requireExternalPortalSession() {
  const session = await getCurrentExternalPortalSession()
  if (!session) {
    throw new Error("External portal authentication is required.")
  }
  return session
}

export function assertExternalPortalScope(
  session: Awaited<ReturnType<typeof requireExternalPortalSession>>,
  input: { clientId: string; projectId: string; pdiItemId?: string }
) {
  if (session.clientId !== input.clientId) {
    throw new Error("Cross-client portal access is denied.")
  }
  if (session.projectId && session.projectId !== input.projectId) {
    throw new Error("Cross-project portal access is denied.")
  }
  const pdiScope = session.invitation.pdiItems.map((item) => item.pdiItemId)
  if (
    input.pdiItemId &&
    pdiScope.length > 0 &&
    !pdiScope.includes(input.pdiItemId)
  ) {
    throw new Error("The PDI item is outside the invitation scope.")
  }
}

export async function revokeExternalInvitation(
  actorUserId: string,
  invitationId: string
) {
  const revokedAt = new Date()
  const invitation = await prisma.externalPortalInvitation.findUnique({
    where: { id: invitationId },
  })
  if (!invitation || invitation.revokedAt) return
  await prisma.$transaction([
    prisma.externalPortalInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt },
    }),
    prisma.externalPortalSession.updateMany({
      where: { invitationId, revokedAt: null },
      data: { revokedAt },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId,
        clientId: invitation.clientId,
        projectId: invitation.projectId,
        action: "identity.external.invitation.revoked",
        entityType: "ExternalPortalInvitation",
        entityId: invitation.id,
      },
    }),
  ])
}

export async function replaceExternalPortalInvitation(
  actorUserId: string,
  invitationId: string,
  deliveryAdapter: PortalInvitationDeliveryAdapter
) {
  const invitation = await prisma.externalPortalInvitation.findUnique({
    where: { id: invitationId },
    include: {
      pdiItems: true,
      identity: {
        include: {
          identity: {
            include: { user: true },
          },
        },
      },
    },
  })
  if (!invitation) {
    throw new Error("External portal invitation was not found.")
  }

  await revokeExternalInvitation(actorUserId, invitation.id)
  const replacement = await createExternalPortalInvitation(
    actorUserId,
    {
      email: invitation.identity.identity.user.email,
      fullName: invitation.identity.identity.user.fullName,
      clientId: invitation.clientId,
      projectId: invitation.projectId ?? undefined,
      pdiItemIds: invitation.pdiItems.map((item) => item.pdiItemId),
      usePolicy: invitation.usePolicy,
    },
    deliveryAdapter
  )
  await prisma.externalPortalInvitation.update({
    where: { id: invitation.id },
    data: { replacedById: replacement.id },
  })
  await prisma.auditLog.create({
    data: {
      actorUserId,
      clientId: invitation.clientId,
      projectId: invitation.projectId,
      action: "identity.external.invitation.replaced",
      entityType: "ExternalPortalInvitation",
      entityId: invitation.id,
      afterSnapshot: { replacementInvitationId: replacement.id },
    },
  })
  return replacement
}

export async function revokeExternalSession(
  rawToken: string | null | undefined
) {
  if (!rawToken) return
  await prisma.externalPortalSession.updateMany({
    where: {
      tokenHash: hashOpaqueToken(rawToken),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  })
}
