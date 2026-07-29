import { NextRequest, NextResponse } from "next/server"
import { hashOpaqueToken } from "@dtg/identity-domain"
import {
  EXTERNAL_CSRF_COOKIE,
  EXTERNAL_SESSION_COOKIE,
  externalPortalCookieOptions,
  redeemExternalPortalInvitation,
} from "@/server/services/identity/external-portal-service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token")
  if (!rawToken) {
    return NextResponse.redirect(
      new URL("/portal/access?error=Invalid%20invitation.", request.url)
    )
  }

  try {
    const redeemed = await redeemExternalPortalInvitation({
      rawToken,
      rateLimitKey: `${request.headers.get("x-forwarded-for") ?? "unknown"}:${rawToken.slice(0, 8)}`,
      ipHash: hashOpaqueToken(
        request.headers.get("x-forwarded-for") ?? "unknown"
      ),
      userAgentHash: hashOpaqueToken(
        request.headers.get("user-agent") ?? "unknown"
      ),
    })
    const response = NextResponse.redirect(new URL("/portal/pdi", request.url))
    response.cookies.set(
      EXTERNAL_SESSION_COOKIE,
      redeemed.rawSessionToken,
      externalPortalCookieOptions.session(redeemed.expiresAt)
    )
    response.cookies.set(
      EXTERNAL_CSRF_COOKIE,
      redeemed.csrfToken,
      externalPortalCookieOptions.csrf(redeemed.expiresAt)
    )
    return response
  } catch {
    return NextResponse.redirect(
      new URL(
        "/portal/access?error=Invitation%20is%20expired%2C%20revoked%2C%20or%20already%20used.",
        request.url
      )
    )
  }
}
