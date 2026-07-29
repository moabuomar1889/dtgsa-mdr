"use server"

import { revalidatePath } from "next/cache"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import {
  createPdiItem,
  markPdiItemSentToClient,
  promotePdiItemToMdr,
  updatePdiClientDocumentNumber,
} from "@/server/services/pdi/pdi-service"

export async function createPdiItemAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.pdiManage)

  await createPdiItem({
    projectId: formData.get("projectId"),
    disciplineId: formData.get("disciplineId"),
    documentTypeCategoryId: formData.get("documentTypeCategoryId"),
    releasePurposeId: formData.get("releasePurposeId"),
    title: formData.get("title"),
    revision: formData.get("revision"),
    remarks: formData.get("remarks"),
    tags: formData.get("tags"),
    createdByUserId: actor.id,
  })

  revalidatePath("/pdi")
  revalidatePath("/dashboard")
}

export async function markPdiItemSentToClientAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.pdiManage)

  await markPdiItemSentToClient({
    pdiItemId: formData.get("pdiItemId"),
  })

  revalidatePath("/pdi")
}

export async function updatePdiClientDocumentNumberAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, [PERMISSIONS.pdiManage, PERMISSIONS.pdiCollaborate])

  await updatePdiClientDocumentNumber({
    pdiItemId: formData.get("pdiItemId"),
    clientDocumentNumber: formData.get("clientDocumentNumber"),
  })

  revalidatePath("/pdi")
}

export async function promotePdiItemToMdrAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.pdiManage)

  await promotePdiItemToMdr({
    pdiItemId: formData.get("pdiItemId"),
  })

  revalidatePath("/pdi")
  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}
