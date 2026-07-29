import { NextRequest, NextResponse } from "next/server"
import { getCurrentAppUser } from "@/server/services/auth/auth-service"
import { downloadFileFromStorage } from "@/server/services/storage/storage-service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const actor = await getCurrentAppUser()
  if (!actor) return new NextResponse("Unauthorized", { status: 401 })

  const kind = request.nextUrl.searchParams.get("kind")
  const profile = actor.signatureProfile
  const provider =
    kind === "initials"
      ? profile?.initialsStorageProvider
      : profile?.signatureStorageProvider
  const providerKey =
    kind === "initials"
      ? profile?.initialsProviderKey
      : profile?.signatureProviderKey

  if (!provider || !providerKey) {
    return new NextResponse("Signature asset not found", { status: 404 })
  }
  const bytes = await downloadFileFromStorage(provider, providerKey)
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": profile?.mimeType ?? "image/png",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
