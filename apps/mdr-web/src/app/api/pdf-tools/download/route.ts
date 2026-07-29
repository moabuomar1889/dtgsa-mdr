import { NextRequest, NextResponse } from "next/server"
import { getCurrentAppUser } from "@/server/services/auth/auth-service"
import {
  downloadFileFromStorage,
  storageProviderForArea,
} from "@/server/services/storage/storage-service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const actor = await getCurrentAppUser()
  if (!actor) return new NextResponse("Unauthorized", { status: 401 })
  const providerKey = request.nextUrl.searchParams.get("key")
  if (!providerKey) return new NextResponse("File not found", { status: 404 })
  const bytes = await downloadFileFromStorage(
    storageProviderForArea("temporary"),
    providerKey
  )
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="pdf-tool-result.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
