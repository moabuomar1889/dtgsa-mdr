import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { updateSupabaseSession } from "./src/lib/supabase/proxy"
import { env } from "./src/lib/config/env"

const INTERNAL_SESSION_COOKIE = "dtg_internal_session"
const EXTERNAL_SESSION_COOKIE = "dtg_external_session"

function routeAudience(pathname: string) {
  if (
    pathname === "/sign-in" ||
    pathname === "/portal/access" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/portal/magic-link"
  ) {
    return "auth"
  }
  if (pathname.startsWith("/portal") || pathname.startsWith("/api/portal/")) {
    return "external"
  }
  if (pathname.startsWith("/verify") || pathname.startsWith("/api/verify/")) {
    return "public"
  }
  return "internal"
}

export async function proxy(request: NextRequest) {
  const audience = routeAudience(request.nextUrl.pathname)
  if (audience === "auth" || audience === "public") {
    return NextResponse.next({ request })
  }
  if (audience === "external") {
    if (!request.cookies.has(EXTERNAL_SESSION_COOKIE)) {
      return NextResponse.redirect(new URL("/portal/access", request.url))
    }
    return NextResponse.next({ request })
  }

  if (env.AUTH_MODE !== "LEGACY_SUPABASE") {
    if (request.cookies.has(INTERNAL_SESSION_COOKIE)) {
      return NextResponse.next({ request })
    }
    if (env.AUTH_MODE === "GOOGLE_WORKSPACE") {
      const signIn = new URL("/sign-in", request.url)
      signIn.searchParams.set(
        "returnTo",
        `${request.nextUrl.pathname}${request.nextUrl.search}`
      )
      return NextResponse.redirect(signIn)
    }
  }
  return updateSupabaseSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
