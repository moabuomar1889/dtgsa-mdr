import "server-only"
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"
import {
  assertWorkforceEmailDomain,
  normalizeWorkforceEmail,
} from "@dtg/identity-domain"
import { env } from "@/lib/config/env"

export const CF_ACCESS_JWT_HEADER = "cf-access-jwt-assertion"

/// The header Cloudflare also sends. It is never trusted on its own; it exists
/// only so a mismatch against the signed assertion can be detected.
export const CF_ACCESS_EMAIL_HEADER = "cf-access-authenticated-user-email"

export type CloudflareAccessIdentity = {
  email: string
  subject: string
  issuedAt: Date
  expiresAt: Date
}

function requiredConfig() {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/+$/, "")
  const audience = env.CF_ACCESS_AUD?.trim()
  const identityDomain = env.ALLOWED_IDENTITY_DOMAIN?.trim().toLowerCase()

  if (!teamDomain || !audience || !identityDomain) {
    throw new Error(
      "Cloudflare Access authentication requires CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD, and ALLOWED_IDENTITY_DOMAIN."
    )
  }

  return { teamDomain, audience, identityDomain }
}

// The signing keys rotate, so the set is fetched once and refreshed by `jose`
// when an unfamiliar key id appears. A refresh failure fails closed because the
// verification below simply throws.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
let jwksTeamDomain: string | null = null

function getJwks(teamDomain: string) {
  if (!jwks || jwksTeamDomain !== teamDomain) {
    jwks = createRemoteJWKSet(
      new URL(`${teamDomain}/cdn-cgi/access/certs`),
      { cacheMaxAge: 10 * 60 * 1000, cooldownDuration: 30 * 1000 }
    )
    jwksTeamDomain = teamDomain
  }
  return jwks
}

function readEmailClaim(payload: JWTPayload) {
  const candidate =
    (payload as { email?: unknown }).email ??
    (payload as { identity?: { email?: unknown } }).identity?.email
  return normalizeWorkforceEmail(candidate)
}

/// Validates the Cloudflare Access application token end to end. Nothing in the
/// request is trusted before the signature, issuer, audience and lifetime have
/// all been verified against the team's published keys.
export async function verifyCloudflareAccessAssertion(
  assertion: string | null | undefined
): Promise<CloudflareAccessIdentity> {
  if (!assertion) {
    throw new Error("The Cloudflare Access assertion header is missing.")
  }

  const { teamDomain, audience, identityDomain } = requiredConfig()

  const { payload } = await jwtVerify(assertion, getJwks(teamDomain), {
    issuer: teamDomain,
    audience,
    algorithms: ["RS256", "ES256"],
  })

  const email = readEmailClaim(payload)

  if (!email) {
    throw new Error("The Cloudflare Access assertion carries no email claim.")
  }

  assertWorkforceEmailDomain(email, identityDomain)

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("The Cloudflare Access assertion carries no subject.")
  }

  if (typeof payload.exp !== "number") {
    throw new Error("The Cloudflare Access assertion carries no expiry.")
  }

  return {
    email,
    subject: payload.sub,
    issuedAt: new Date((payload.iat ?? Math.floor(Date.now() / 1000)) * 1000),
    expiresAt: new Date(payload.exp * 1000),
  }
}

/// Convenience wrapper for request handlers. Returns null instead of throwing so
/// a caller can render a denial page rather than an error, but it never returns
/// an identity that failed any check.
export async function readCloudflareAccessIdentity(
  headers: Headers
): Promise<CloudflareAccessIdentity | null> {
  try {
    return await verifyCloudflareAccessAssertion(
      headers.get(CF_ACCESS_JWT_HEADER)
    )
  } catch {
    return null
  }
}
