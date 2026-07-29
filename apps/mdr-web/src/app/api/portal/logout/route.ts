import { NextRequest, NextResponse } from "next/server"
import {
  EXTERNAL_CSRF_COOKIE,
  EXTERNAL_SESSION_COOKIE,
  revokeExternalSession,
} from "@/server/services/identity/external-portal-service"

export async function POST(request: NextRequest) {
  await revokeExternalSession(
    request.cookies.get(EXTERNAL_SESSION_COOKIE)?.value
  )
  const response = NextResponse.redirect(new URL("/portal/access", request.url))
  response.cookies.delete(EXTERNAL_SESSION_COOKIE)
  response.cookies.delete(EXTERNAL_CSRF_COOKIE)
  return response
}
