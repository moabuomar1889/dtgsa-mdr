"use server"

import { revalidatePath } from "next/cache"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { updatePortalPdiClientDocumentNumber } from "@/server/services/pdi/pdi-excel-service"

export async function updatePortalPdiClientDocumentNumberAction(
  formData: FormData
) {
  const user = await requireCurrentAppUser()

  await updatePortalPdiClientDocumentNumber(user, {
    pdiItemId: formData.get("pdiItemId"),
    clientDocumentNumber: formData.get("clientDocumentNumber"),
  })

  revalidatePath("/portal/pdi")
  revalidatePath("/pdi")
}
