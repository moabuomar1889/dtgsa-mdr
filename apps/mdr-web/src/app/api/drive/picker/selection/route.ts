import { NextResponse } from "next/server"
import { getCurrentAppUser } from "@/server/services/auth/auth-service"
import { reserveControlledMainFile } from "@/server/services/drive/controlled-drive-service"
import { createSourceDriveAdapter } from "@/server/services/local/local-provider-factory"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const actor = await getCurrentAppUser()
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json()) as {
    revisionId?: unknown
    nonce?: unknown
    fileId?: unknown
  }
  if (
    typeof body.revisionId !== "string" ||
    typeof body.nonce !== "string" ||
    typeof body.fileId !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid selection handoff" },
      { status: 400 }
    )
  }
  try {
    const reserved = await reserveControlledMainFile({
      actor,
      revisionId: body.revisionId,
      rawNonce: body.nonce,
      selectedFileId: body.fileId,
      adapter: createSourceDriveAdapter(),
    })
    return NextResponse.json(reserved, { status: 202 })
  } catch {
    return NextResponse.json(
      { error: "Drive selection could not be accepted" },
      { status: 400 }
    )
  }
}
