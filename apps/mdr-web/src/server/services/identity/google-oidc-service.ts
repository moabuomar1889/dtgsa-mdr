import "server-only"
import {
  assertOidcState,
  createPkcePair,
  decryptTransientSecret,
  encryptTransientSecret,
  hashOpaqueToken,
  issueOpaqueToken,
  sanitizeReturnTo,
  validateGoogleWorkspaceClaims,
  type GoogleOidcClaims,
} from "@dtg/identity-domain"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { prisma } from "@/lib/prisma/client"
import { createInternalSession } from "./session-service"
import { getIdentityConfig } from "./identity-config"

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
const GOOGLE_JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs"

export const OIDC_STATE_COOKIE = "dtg_oidc_state"

export interface GoogleOidcAdapter {
  exchangeCode(input: {
    code: string
    codeVerifier: string
    clientId: string
    clientSecret: string
    redirectUri: string
  }): Promise<GoogleOidcClaims>
}

export class LiveGoogleOidcAdapter implements GoogleOidcAdapter {
  async exchangeCode(input: {
    code: string
    codeVerifier: string
    clientId: string
    clientSecret: string
    redirectUri: string
  }) {
    const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: input.code,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
        grant_type: "authorization_code",
        code_verifier: input.codeVerifier,
      }),
      cache: "no-store",
    })
    if (!tokenResponse.ok) {
      throw new Error("Google token exchange failed.")
    }

    const tokenBody = (await tokenResponse.json()) as {
      id_token?: unknown
    }
    if (typeof tokenBody.id_token !== "string") {
      throw new Error("Google token response did not include an ID token.")
    }

    const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_ENDPOINT))
    const verified = await jwtVerify(tokenBody.id_token, jwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: input.clientId,
    })
    return verified.payload as GoogleOidcClaims
  }
}

export async function beginGoogleWorkspaceSignIn(
  returnTo?: string | null,
  forceReauthentication = false
) {
  const config = getIdentityConfig()
  if (!config.googleEnabled || !config.clientId || !config.redirectUri) {
    throw new Error("Google Workspace authentication is not enabled.")
  }

  const state = issueOpaqueToken()
  const nonce = issueOpaqueToken()
  const pkce = createPkcePair()
  const encryptedVerifier = encryptTransientSecret(
    pkce.verifier,
    config.encryptionKey
  )
  const expiresAt = new Date(
    Date.now() + config.oidcTransactionTtlMinutes * 60_000
  )

  await prisma.oidcAuthorizationTransaction.create({
    data: {
      stateHash: hashOpaqueToken(state),
      nonceHash: hashOpaqueToken(nonce),
      codeVerifierCiphertext: encryptedVerifier.ciphertext,
      codeVerifierIv: encryptedVerifier.iv,
      codeVerifierAuthTag: encryptedVerifier.authTag,
      redirectUri: config.redirectUri,
      returnTo: sanitizeReturnTo(returnTo),
      expiresAt,
    },
  })

  const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT)
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    prompt: forceReauthentication ? "login" : "select_account",
    hd: config.allowedDomains[0],
    ...(forceReauthentication ? { max_age: "0" } : {}),
  }).toString()

  return {
    authorizationUrl,
    state,
    expiresAt,
  }
}

async function resolveGoogleWorkspaceUser(identity: {
  subject: string
  email: string
  hostedDomain: string
  fullName: string | null
}) {
  const subjectHash = hashOpaqueToken(identity.subject)
  const [subjectMatch, emailMatches, approvedReview] = await Promise.all([
    prisma.googleWorkspaceIdentity.findUnique({
      where: { googleSubject: identity.subject },
      include: {
        identity: {
          include: { user: true },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        email: {
          equals: identity.email,
          mode: "insensitive",
        },
        deletedAt: null,
      },
      take: 2,
    }),
    prisma.identityLinkReview.findFirst({
      where: {
        provider: "google_workspace",
        subjectHash,
        status: "Approved",
      },
      orderBy: { resolvedAt: "desc" },
    }),
  ])
  const resolution =
    approvedReview?.resolution &&
    typeof approvedReview.resolution === "object" &&
    !Array.isArray(approvedReview.resolution)
      ? approvedReview.resolution
      : null
  const approvedUserId =
    resolution &&
    "selectedUserId" in resolution &&
    typeof resolution.selectedUserId === "string"
      ? resolution.selectedUserId
      : null
  const approvedUser =
    !subjectMatch &&
    approvedUserId &&
    approvedReview?.email.toLowerCase() === identity.email
      ? await prisma.user.findFirst({
          where: {
            id: approvedUserId,
            deletedAt: null,
          },
        })
      : null
  const hasCollision =
    Boolean(subjectMatch) &&
    emailMatches.some(
      (candidate) => candidate.id !== subjectMatch?.identity.userId
    )
  if (
    hasCollision ||
    (!subjectMatch && !approvedUser && emailMatches.length !== 1)
  ) {
    await prisma.identityLinkReview.upsert({
      where: {
        provider_subjectHash_status: {
          provider: "google_workspace",
          subjectHash,
          status: "Pending",
        },
      },
      update: {
        email: identity.email,
        candidateUserIds: [
          ...(subjectMatch ? [subjectMatch.identity.userId] : []),
          ...emailMatches.map((candidate) => candidate.id),
        ],
      },
      create: {
        provider: "google_workspace",
        subjectHash,
        email: identity.email,
        candidateUserIds: [
          ...(subjectMatch ? [subjectMatch.identity.userId] : []),
          ...emailMatches.map((candidate) => candidate.id),
        ],
      },
    })
    throw new Error("Google account linking requires administrator review.")
  }

  return prisma.$transaction(async (tx) => {
    const user = subjectMatch?.identity.user ?? approvedUser ?? emailMatches[0]
    if (!user) {
      throw new Error("Google account linking requires administrator review.")
    }
    if (!subjectMatch) {
      const userIdentity = await tx.userIdentity.create({
        data: {
          userId: user.id,
          provider: "google_workspace",
          subject: identity.subject,
          emailAtLink: identity.email,
          metadata: {
            linkingMethod: "verified_email_and_workspace_domain",
          },
        },
      })
      await tx.googleWorkspaceIdentity.create({
        data: {
          userIdentityId: userIdentity.id,
          googleSubject: identity.subject,
          hostedDomain: identity.hostedDomain,
          lastVerifiedAt: new Date(),
        },
      })
      if (approvedReview && approvedUser) {
        await tx.identityLinkReview.update({
          where: { id: approvedReview.id },
          data: {
            status: "Applied",
            resolution: {
              selectedUserId: approvedUser.id,
              linkingMethod: "admin_review_then_fresh_oidc",
            },
          },
        })
      }
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "identity.google.account_linked",
          entityType: "UserIdentity",
          entityId: userIdentity.id,
          afterSnapshot: {
            provider: "google_workspace",
            subjectHash: hashOpaqueToken(identity.subject),
            hostedDomain: identity.hostedDomain,
          },
        },
      })
    } else {
      await tx.googleWorkspaceIdentity.update({
        where: { id: subjectMatch.id },
        data: {
          hostedDomain: identity.hostedDomain,
          lastVerifiedAt: new Date(),
        },
      })
    }

    if (!user.isActive || user.deletedAt) {
      throw new Error("The employee account is suspended or deactivated.")
    }

    return tx.user.update({
      where: { id: user.id },
      data: {
        email: identity.email,
        fullName: identity.fullName ?? user.fullName,
      },
    })
  })
}

export async function completeGoogleWorkspaceSignIn(input: {
  state: string
  browserState: string
  code: string
  currentSessionToken?: string | null
  ipHash?: string | null
  userAgentHash?: string | null
  adapter?: GoogleOidcAdapter
}) {
  const config = getIdentityConfig()
  if (
    !config.googleEnabled ||
    !config.clientId ||
    !config.clientSecret ||
    !config.redirectUri
  ) {
    throw new Error("Google Workspace authentication is not enabled.")
  }

  assertOidcState(input.state, hashOpaqueToken(input.browserState))
  const stateHash = hashOpaqueToken(input.state)
  const transaction = await prisma.oidcAuthorizationTransaction.findUnique({
    where: { stateHash },
  })
  if (
    !transaction ||
    transaction.consumedAt ||
    transaction.expiresAt <= new Date() ||
    transaction.redirectUri !== config.redirectUri
  ) {
    throw new Error("OIDC transaction is invalid or expired.")
  }

  const consumed = await prisma.oidcAuthorizationTransaction.updateMany({
    where: {
      id: transaction.id,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  })
  if (consumed.count !== 1) {
    throw new Error("OIDC transaction was already consumed.")
  }

  const codeVerifier = decryptTransientSecret(
    {
      ciphertext: transaction.codeVerifierCiphertext,
      iv: transaction.codeVerifierIv,
      authTag: transaction.codeVerifierAuthTag,
    },
    config.encryptionKey
  )
  const claims = await (
    input.adapter ?? new LiveGoogleOidcAdapter()
  ).exchangeCode({
    code: input.code,
    codeVerifier,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
  })

  const expectedNonce = typeof claims.nonce === "string" ? claims.nonce : ""
  if (hashOpaqueToken(expectedNonce) !== transaction.nonceHash) {
    throw new Error("Google identity nonce is invalid.")
  }
  const identity = validateGoogleWorkspaceClaims(claims, {
    clientId: config.clientId,
    expectedNonce,
    allowedDomains: config.allowedDomains,
  })
  const user = await resolveGoogleWorkspaceUser(identity)
  const session = await createInternalSession({
    userId: user.id,
    authMode: "GOOGLE_WORKSPACE",
    currentToken: input.currentSessionToken,
    ipHash: input.ipHash,
    userAgentHash: input.userAgentHash,
  })

  return {
    ...session,
    returnTo: sanitizeReturnTo(transaction.returnTo),
    user,
  }
}
