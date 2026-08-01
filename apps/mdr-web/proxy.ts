import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { routeAudience } from "@/lib/routing/route-audience"

const INTERNAL_SESSION_COOKIE = "dtg_internal_session"
const EXTERNAL_SESSION_COOKIE = "dtg_external_session"

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

  if (request.cookies.has(INTERNAL_SESSION_COOKIE)) {
    return NextResponse.next({ request })
  }
  const signIn = new URL("/sign-in", request.url)
  signIn.searchParams.set(
    "returnTo",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  )
  return NextResponse.redirect(signIn)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
