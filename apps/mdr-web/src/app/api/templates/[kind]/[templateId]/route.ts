import { NextRequest, NextResponse } from "next/server"
import { getCurrentAppUser } from "@/server/services/auth/auth-service"
import { prisma } from "@/lib/prisma/client"
import { downloadFileFromStorage } from "@/server/services/storage/storage-service"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ kind: string; templateId: string }> }
) {
  const actor = await getCurrentAppUser()
  if (!actor) return new NextResponse("Unauthorized", { status: 401 })
  const { kind, templateId } = await context.params
  const template =
    kind === "cover"
      ? await prisma.coverSheetTemplate.findUnique({ where: { id: templateId } })
      : kind === "transmittal"
        ? await prisma.transmittalTemplate.findUnique({
            where: { id: templateId },
          })
        : null
  if (!template?.providerKey || template.deletedAt) {
    return new NextResponse("Template not found", { status: 404 })
  }
  const bytes = await downloadFileFromStorage(
    template.storageProvider,
    template.providerKey
  )
  return new NextResponse(bytes, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${template.fileName.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
