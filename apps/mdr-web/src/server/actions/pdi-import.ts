"use server"

import { revalidatePath } from "next/cache"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import { importPdiWorkbook } from "@/server/services/pdi/pdi-excel-service"

export async function importPdiWorkbookAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, [PERMISSIONS.pdiManage, PERMISSIONS.pdiCollaborate])

  await importPdiWorkbook(actor, {
    projectId: formData.get("projectId"),
    file: formData.get("file"),
  })

  revalidatePath("/pdi")
  revalidatePath("/dashboard")
}
