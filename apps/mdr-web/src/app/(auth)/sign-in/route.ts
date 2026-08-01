import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getIdentityConfig } from "@/server/services/identity/identity-config"
import {
  CloudflareAccessNotAuthorizedError,
  signInWithCloudflareAccess,
} from "@/server/services/identity/cloudflare-access-sign-in"
import { verifyCloudflareAccessRequest } from "@/server/services/identity/cloudflare-access-service"
import {
  completeWorkforceSignIn,
  type WorkforceSignInDependencies,
} from "@/server/services/identity/workforce-sign-in-route"
import {
  INTERNAL_CSRF_COOKIE,
  INTERNAL_SESSION_COOKIE,
  internalCsrfCookieOptions,
  internalSessionCookieOptions,
} from "@/server/services/identity/session-service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const identityConfig = getIdentityConfig()
  const dependencies: WorkforceSignInDependencies = {
    authMode: identityConfig.authMode,
    verifyIdentity: verifyCloudflareAccessRequest,
    signIn: signInWithCloudflareAccess,
    isNotAuthorizedError: (error) =>
      error instanceof CloudflareAccessNotAuthorizedError,
  }
  const result = await completeWorkforceSignIn(
    {
      headers: request.headers,
      currentSessionToken: request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
    },
    dependencies
  )
  // Keep the redirect relative so reverse proxies cannot leak their internal
  // origin (for example localhost:3000) into the user's browser.
  const response = new NextResponse(null, {
    status: 303,
    headers: { location: result.redirectTo },
  })

  if (result.completed) {
    response.cookies.set(
      INTERNAL_SESSION_COOKIE,
      result.completed.rawToken,
      internalSessionCookieOptions(result.completed.expiresAt)
    )
    response.cookies.set(
      INTERNAL_CSRF_COOKIE,
      result.completed.csrfToken,
      internalCsrfCookieOptions(result.completed.expiresAt)
    )
  }

  return response
}
