import { getApprovalActor } from "../../../../../server/auth"
import { prisma } from "../../../../../server/database"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  context: { params: Promise<{ fileObjectId: string }> }
) {
  const actor = await getApprovalActor()
  if (!actor) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { fileObjectId } = await context.params
  const origin =
    process.env.MDR_INTERNAL_ORIGIN?.trim() || "http://127.0.0.1:3000"
  const upstreamUrl = new URL(
    `/api/files/${encodeURIComponent(fileObjectId)}`,
    origin
  )
  const headers = new Headers()
  const range = request.headers.get("range")
  const cookie = request.headers.get("cookie")
  if (range) headers.set("Range", range)
  if (cookie) headers.set("Cookie", cookie)
  const upstream = await fetch(upstreamUrl, {
    headers,
    cache: "no-store",
    redirect: "error",
  })
  const reviewSessionId = new URL(request.url).searchParams.get("reviewSession")
  if (reviewSessionId) {
    await prisma.reviewSession.updateMany({
      where: {
        id: reviewSessionId,
        userId: actor.id,
        revokedAt: null,
      },
      data: range
        ? { lastActivityAt: new Date() }
        : { lastActivityAt: new Date(), downloadedAt: new Date() },
    })
  }
  const responseHeaders = new Headers()
  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "cache-control",
    "pragma",
    "x-content-type-options",
  ]) {
    const value = upstream.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }
  responseHeaders.set("Content-Security-Policy", "default-src 'none'")
  responseHeaders.set("Cross-Origin-Resource-Policy", "same-origin")
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
