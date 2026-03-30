"use server"

import { revalidatePath } from "next/cache"
import {
  createPdiItem,
  markPdiItemSentToClient,
  promotePdiItemToMdr,
  updatePdiClientDocumentNumber,
} from "@/server/services/pdi/pdi-service"

export async function createPdiItemAction(formData: FormData) {
  await createPdiItem({
    projectId: formData.get("projectId"),
    disciplineId: formData.get("disciplineId"),
    documentTypeCategoryId: formData.get("documentTypeCategoryId"),
    releasePurposeId: formData.get("releasePurposeId"),
    title: formData.get("title"),
    revision: formData.get("revision"),
    remarks: formData.get("remarks"),
    tags: formData.get("tags"),
  })

  revalidatePath("/pdi")
  revalidatePath("/dashboard")
}

export async function markPdiItemSentToClientAction(formData: FormData) {
  await markPdiItemSentToClient({
    pdiItemId: formData.get("pdiItemId"),
  })

  revalidatePath("/pdi")
}

export async function updatePdiClientDocumentNumberAction(formData: FormData) {
  await updatePdiClientDocumentNumber({
    pdiItemId: formData.get("pdiItemId"),
    clientDocumentNumber: formData.get("clientDocumentNumber"),
  })

  revalidatePath("/pdi")
}

export async function promotePdiItemToMdrAction(formData: FormData) {
  await promotePdiItemToMdr({
    pdiItemId: formData.get("pdiItemId"),
  })

  revalidatePath("/pdi")
  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}
