import { NextResponse } from "next/server"
import { beginGoogleWorkspaceSignIn } from "@/server/services/identity/google-oidc-service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const started = await beginGoogleWorkspaceSignIn(
      searchParams.get("returnTo"),
      searchParams.get("force") === "true"
    )
    const response = NextResponse.redirect(started.authorizationUrl)
    response.cookies.set("dtg_oidc_state", started.state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google/callback",
      expires: started.expiresAt,
    })
    return response
  } catch {
    return NextResponse.redirect(
      new URL(
        "/sign-in?error=Google%20sign-in%20is%20not%20available.",
        request.url
      )
    )
  }
}
