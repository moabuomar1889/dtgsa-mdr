"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import {
  assertExternalPortalCsrf,
  EXTERNAL_SESSION_COOKIE,
  requireExternalPortalSession,
} from "@/server/services/identity/external-portal-service"
import { updateExternalPortalPdiClientDocumentNumber } from "@/server/services/pdi/pdi-excel-service"

export async function updatePortalPdiClientDocumentNumberAction(
  formData: FormData
) {
  const cookieStore = await cookies()
  const rawSessionToken = cookieStore.get(EXTERNAL_SESSION_COOKIE)?.value
  const rawCsrfToken = String(formData.get("csrfToken") ?? "")
  if (!rawSessionToken || !rawCsrfToken) {
    throw new Error("External portal CSRF validation failed.")
  }
  await assertExternalPortalCsrf({ rawSessionToken, rawCsrfToken })
  const session = await requireExternalPortalSession()

  await updateExternalPortalPdiClientDocumentNumber(session, {
    pdiItemId: formData.get("pdiItemId"),
    clientDocumentNumber: formData.get("clientDocumentNumber"),
  })

  revalidatePath("/portal/pdi")
  revalidatePath("/pdi")
}
