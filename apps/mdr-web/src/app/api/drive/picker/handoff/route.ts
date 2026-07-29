import { NextResponse } from "next/server"
import { getCurrentAppUser } from "@/server/services/auth/auth-service"
import { beginPickerSelection } from "@/server/services/drive/controlled-drive-service"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const actor = await getCurrentAppUser()
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = (await request.json()) as { projectId?: unknown }
  if (typeof body.projectId !== "string") {
    return NextResponse.json({ error: "Project is required" }, { status: 400 })
  }
  const handoff = await beginPickerSelection(actor, body.projectId)
  return NextResponse.json({
    nonce: handoff.nonce,
    expiresAt: handoff.expiresAt.toISOString(),
  })
}
