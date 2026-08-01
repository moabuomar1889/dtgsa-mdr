import { NextRequest, NextResponse } from "next/server"
import { hashOpaqueToken } from "@dtg/identity-domain"
import { assertLoopbackUrl } from "@dtg/local-acceptance"
import { prisma } from "@/lib/prisma/client"
import { isLocalAcceptanceEnabled } from "@/server/services/local/local-acceptance-access"
import {
  createInternalSession,
  INTERNAL_CSRF_COOKIE,
  INTERNAL_SESSION_COOKIE,
  internalCsrfCookieOptions,
  internalSessionCookieOptions,
} from "@/server/services/identity/session-service"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!isLocalAcceptanceEnabled(process.env)) {
    return new NextResponse("Not found", { status: 404 })
  }
  const form = await request.formData()
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase()
  if (!email.endsWith("@local.test")) {
    return new NextResponse("Synthetic local identity required.", {
      status: 400,
    })
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.isActive || user.deletedAt) {
    return new NextResponse("Local identity is unavailable.", { status: 403 })
  }
  const completed = await createInternalSession({
    userId: user.id,
    authMode: "LOCAL_ACCEPTANCE_IDENTITY",
    currentToken: request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
    ipHash: hashOpaqueToken("127.0.0.1"),
    userAgentHash: hashOpaqueToken(
      request.headers.get("user-agent") ?? "local-acceptance"
    ),
  })
  const localOrigin = assertLoopbackUrl(
    process.env.NEXT_PUBLIC_APP_URL ?? request.url,
    "Local MDR origin"
  )
  const response = NextResponse.redirect(
    new URL("/dashboard", localOrigin),
    303
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
  return response
}
