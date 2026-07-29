import { NextResponse } from "next/server"
import { getCurrentAppUser } from "@/server/services/auth/auth-service"
import { prisma } from "@/lib/prisma/client"
import { downloadFileFromStorage } from "@/server/services/storage/storage-service"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ generatedDocumentId: string }> }
) {
  const actor = await getCurrentAppUser()
  if (!actor) return new NextResponse("Unauthorized", { status: 401 })
  const { generatedDocumentId } = await context.params
  const file = await prisma.generatedDocument.findUnique({
    where: { id: generatedDocumentId },
  })
  if (!file?.providerKey) {
    return new NextResponse("File not found", { status: 404 })
  }
  const bytes = await downloadFileFromStorage(
    file.storageProvider,
    file.providerKey
  )
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file.fileName.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
