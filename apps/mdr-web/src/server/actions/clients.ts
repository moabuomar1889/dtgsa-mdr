"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import {
  clearClientLogo,
  setClientLogo,
} from "@/server/services/clients/client-logo-service"
import { updateClientPreferences } from "@/server/services/clients/client-management"

function checked(value: FormDataEntryValue | null) {
  return value === "on" || value === "true"
}

export async function updateClientPreferencesAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.clientsManage)
  const clientId = String(formData.get("clientId") ?? "")

  await updateClientPreferences({
    clientId,
    defaultTimezone: formData.get("defaultTimezone"),
    defaultUploadMaxMb: formData.get("defaultUploadMaxMb"),
    defaultTransmittalMaxMb: formData.get("defaultTransmittalMaxMb"),
    defaultResponseDays: formData.get("defaultResponseDays"),
    defaultTransmittalPurpose: formData.get("defaultTransmittalPurpose"),
    requireClientCover: checked(formData.get("requireClientCover")),
    includeDtgsaCover: checked(formData.get("includeDtgsaCover")),
  })

  revalidatePath("/clients")
  revalidatePath(`/clients/${clientId}`)
  redirect(`/clients/${clientId}`)
}

export async function setClientLogoAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.clientsManage)
  const clientId = String(formData.get("clientId") ?? "")

  await setClientLogo({
    clientId,
    file: formData.get("file"),
    actorUserId: actor.id,
  })
  revalidatePath(`/clients/${clientId}`)
}

export async function clearClientLogoAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.clientsManage)
  const clientId = String(formData.get("clientId") ?? "")

  await clearClientLogo({ clientId, actorUserId: actor.id })
  revalidatePath(`/clients/${clientId}`)
}
