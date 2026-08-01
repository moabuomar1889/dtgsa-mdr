import "server-only"
import { AuditSeverity } from "@prisma/client"
import { normalizeWorkforceEmail } from "@dtg/identity-domain"
import { prisma } from "@/lib/prisma/client"
import { createInternalSession } from "@/server/services/identity/session-service"
import { getIdentityConfig } from "@/server/services/identity/identity-config"
import type { CloudflareAccessIdentity } from "@/server/services/identity/cloudflare-access-service"

export class CloudflareAccessNotAuthorizedError extends Error {
  constructor() {
    // Deliberately generic: the response must not reveal whether some other
    // address is registered in this application.
    super("This account is not authorized for this application.")
    this.name = "CloudflareAccessNotAuthorizedError"
  }
}

async function recordDenial(email: string, reason: string) {
  await prisma.systemLog.create({
    data: {
      source: "identity",
      action: "cloudflare_access.denied",
      message: reason,
      severity: AuditSeverity.Warning,
      // The token itself is never logged, only the decision and the subject.
      metadata: { email },
    },
  })
}

/// Reconciles the explicitly approved bootstrap administrator. Idempotent: it
/// only ever activates the configured address, and never grants a role to
/// anyone else.
async function reconcileBootstrapAdministrator(email: string) {
  const configured = normalizeWorkforceEmail(
    getIdentityConfig().bootstrapAdminEmail
  )

  if (!configured || configured !== email) {
    return null
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  })

  if (!existing) {
    return null
  }

  if (existing.isActive && !existing.deletedAt) {
    return existing
  }

  const reactivated = await prisma.user.update({
    where: { id: existing.id },
    data: { isActive: true, deletedAt: null },
  })

  await prisma.auditLog.create({
    data: {
      action: "identity.bootstrap_admin.reconciled",
      entityType: "User",
      entityId: reactivated.id,
      severity: AuditSeverity.Warning,
      afterSnapshot: { email },
    },
  })

  return reactivated
}

/// Establishes a normal application session from a already-verified Cloudflare
/// Access identity. Cloudflare proves who the person is; this decides whether
/// they may use this application at all.
export async function signInWithCloudflareAccess(input: {
  identity: CloudflareAccessIdentity
  currentSessionToken?: string | null
  ipHash?: string | null
  userAgentHash?: string | null
}) {
  const email = input.identity.email

  let user = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      deletedAt: null,
    },
  })

  if (!user) {
    user = await reconcileBootstrapAdministrator(email)
  }

  if (!user) {
    await recordDenial(email, "No local user record exists for this identity.")
    throw new CloudflareAccessNotAuthorizedError()
  }

  if (!user.isActive || user.deletedAt) {
    await recordDenial(email, "The local user record is suspended or revoked.")
    throw new CloudflareAccessNotAuthorizedError()
  }

  const session = await createInternalSession({
    userId: user.id,
    authMode: "CLOUDFLARE_ACCESS",
    authenticatedAt: input.identity.issuedAt,
    currentToken: input.currentSessionToken,
    ipHash: input.ipHash,
    userAgentHash: input.userAgentHash,
  })

  // Last-login evidence is the session row itself: `createInternalSession`
  // stamps `authenticatedAt` and writes an `identity.internal.login` audit
  // entry, and it only runs once the local authorization checks above pass.

  return { ...session, user }
}
