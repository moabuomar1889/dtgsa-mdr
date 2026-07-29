import { Readable } from "node:stream"
import { NextResponse } from "next/server"
import { getCurrentAppUser } from "@/server/services/auth/auth-service"
import { openControlledFile } from "@/server/services/drive/controlled-file-delivery"
import { GoogleDriveStorageAdapter } from "@/server/services/drive/drive-storage-adapter"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  context: { params: Promise<{ fileObjectId: string }> }
) {
  const actor = await getCurrentAppUser()
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { fileObjectId } = await context.params
    const opened = await openControlledFile({
      actor,
      fileObjectId,
      rangeHeader: request.headers.get("range"),
      adapter: new GoogleDriveStorageAdapter(),
    })
    return new NextResponse(
      Readable.toWeb(opened.stream as Readable) as ReadableStream,
      {
        status: opened.status,
        headers: opened.headers,
      }
    )
  } catch {
    return NextResponse.json({ error: "File is unavailable" }, { status: 404 })
  }
}
