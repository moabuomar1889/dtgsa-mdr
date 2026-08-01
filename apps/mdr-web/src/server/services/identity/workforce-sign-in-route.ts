import type { AuthMode } from "@dtg/identity-domain"
import { hashOpaqueToken } from "@dtg/identity-domain"
import type { CloudflareAccessIdentity } from "./cloudflare-access-service"

export type CompletedWorkforceSession = {
  rawToken: string
  csrfToken: string
  expiresAt: Date
}

export type WorkforceSignInResult = {
  redirectTo: string
  completed?: CompletedWorkforceSession
}

export type WorkforceSignInDependencies = {
  authMode: AuthMode
  verifyIdentity: (headers: Headers) => Promise<CloudflareAccessIdentity>
  signIn: (input: {
    identity: CloudflareAccessIdentity
    currentSessionToken?: string | null
    ipHash?: string | null
    userAgentHash?: string | null
  }) => Promise<CompletedWorkforceSession>
  isNotAuthorizedError: (error: unknown) => boolean
}

function requestFingerprint(headers: Headers, name: string) {
  const value = headers.get(name)?.trim()
  return value ? hashOpaqueToken(value) : null
}

export async function completeWorkforceSignIn(
  request: {
    headers: Headers
    currentSessionToken?: string | null
  },
  dependencies: WorkforceSignInDependencies
): Promise<WorkforceSignInResult> {
  if (dependencies.authMode === "LOCAL_ACCEPTANCE_IDENTITY") {
    return { redirectTo: "/local-acceptance" } as const
  }

  if (dependencies.authMode !== "CLOUDFLARE_ACCESS") {
    return { redirectTo: "/access-denied?reason=unsupported" } as const
  }

  try {
    const identity = await dependencies.verifyIdentity(request.headers)
    const completed = await dependencies.signIn({
      identity,
      currentSessionToken: request.currentSessionToken,
      ipHash: requestFingerprint(request.headers, "cf-connecting-ip"),
      userAgentHash: requestFingerprint(request.headers, "user-agent"),
    })
    return { redirectTo: "/dashboard", completed } as const
  } catch (error) {
    const reason = dependencies.isNotAuthorizedError(error)
      ? "not-authorized"
      : "identity-unavailable"
    return { redirectTo: `/access-denied?reason=${reason}` } as const
  }
}
