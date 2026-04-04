import { NextResponse } from "next/server"
import { getCurrentAppUser } from "@/server/services/auth/auth-service"
import { exportPdiWorkbook } from "@/server/services/pdi/pdi-excel-service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const user = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const workbook = await exportPdiWorkbook({
    user,
    projectId,
  })

  const fileName = projectId ? `pdi-${projectId}.xlsx` : "pdi-export.xlsx"

  return new NextResponse(Buffer.from(workbook), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
    },
  })
}
