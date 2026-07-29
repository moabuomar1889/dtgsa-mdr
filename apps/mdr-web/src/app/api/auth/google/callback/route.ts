import { NextRequest, NextResponse } from "next/server"
import { hashOpaqueToken } from "@dtg/identity-domain"
import {
  INTERNAL_CSRF_COOKIE,
  INTERNAL_SESSION_COOKIE,
  internalCsrfCookieOptions,
  internalSessionCookieOptions,
} from "@/server/services/identity/session-service"
import {
  completeGoogleWorkspaceSignIn,
  OIDC_STATE_COOKIE,
} from "@/server/services/identity/google-oidc-service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state")
  const code = request.nextUrl.searchParams.get("code")
  const browserState = request.cookies.get(OIDC_STATE_COOKIE)?.value
  if (!state || !code || !browserState) {
    return NextResponse.redirect(
      new URL("/sign-in?error=Invalid%20Google%20callback.", request.url)
    )
  }

  try {
    const completed = await completeGoogleWorkspaceSignIn({
      state,
      browserState,
      code,
      currentSessionToken: request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
      ipHash: hashOpaqueToken(
        request.headers.get("x-forwarded-for") ?? "unknown"
      ),
      userAgentHash: hashOpaqueToken(
        request.headers.get("user-agent") ?? "unknown"
      ),
    })
    const response = NextResponse.redirect(
      new URL(completed.returnTo, request.url)
    )
    response.cookies.set(
      INTERNAL_SESSION_COOKIE,
      completed.rawToken,
      internalSessionCookieOptions(completed.expiresAt)
    )
    response.cookies.set(
      INTERNAL_CSRF_COOKIE,
      completed.csrfToken,
      internalCsrfCookieOptions(completed.expiresAt)
    )
    response.cookies.delete(OIDC_STATE_COOKIE)
    return response
  } catch {
    const response = NextResponse.redirect(
      new URL(
        "/sign-in?error=Google%20identity%20could%20not%20be%20verified.",
        request.url
      )
    )
    response.cookies.delete(OIDC_STATE_COOKIE)
    return response
  }
}
