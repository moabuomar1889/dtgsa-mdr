import { NextResponse } from "next/server"
import { getCurrentAppUser } from "@/server/services/auth/auth-service"
import { prisma } from "@/lib/prisma/client"
import { downloadFileFromStorage } from "@/server/services/storage/storage-service"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ transmittalId: string }> }
) {
  const actor = await getCurrentAppUser()
  if (!actor) return new NextResponse("Unauthorized", { status: 401 })
  const { transmittalId } = await context.params
  const file = await prisma.generatedDocument.findFirst({
    where: { transmittalId },
    orderBy: { createdAt: "desc" },
  })
  if (!file?.providerKey) {
    return new NextResponse("Transmittal PDF not found", { status: 404 })
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
