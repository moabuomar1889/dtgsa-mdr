import { NextResponse } from "next/server"
import { requireExternalPortalSession } from "@/server/services/identity/external-portal-service"
import { exportExternalPortalPdiWorkbook } from "@/server/services/pdi/pdi-excel-service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await requireExternalPortalSession()
    const projectId = new URL(request.url).searchParams.get("projectId")
    if (!projectId) {
      return NextResponse.json(
        { error: "A project scope is required." },
        { status: 400 }
      )
    }
    const workbook = await exportExternalPortalPdiWorkbook(session, projectId)
    return new NextResponse(Buffer.from(workbook), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pdi-${projectId}.xlsx"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
}
