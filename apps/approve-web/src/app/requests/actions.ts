"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireApprovalActor } from "../../server/auth"
import { prisma } from "../../server/database"
import { submitGeneralRequest } from "../../server/general-request-service"

export async function submitGeneralRequestAction(formData: FormData) {
  const actor = await requireApprovalActor()
  const formFields = Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => key.startsWith("field:"))
      .map(([key, value]) => [key.slice(6), normalizeValue(value)])
  )
  await submitGeneralRequest(prisma, {
    requestTypeVersionId: String(formData.get("requestTypeVersionId") ?? ""),
    sourceSystem: String(formData.get("sourceSystem") ?? "APPROVE_WEB"),
    sourceRecordId:
      String(formData.get("sourceRecordId") ?? "") || randomUUID(),
    purpose: String(formData.get("purpose") ?? "").trim(),
    classification: String(formData.get("classification") ?? "INTERNAL"),
    projectId: String(formData.get("projectId") ?? "") || undefined,
    clientId: String(formData.get("clientId") ?? "") || undefined,
    submittedByUserId: actor.id,
    formData: formFields,
    attachmentFileObjectIds: String(
      formData.get("attachmentFileObjectIds") ?? ""
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    correlationId: randomUUID(),
  })
  revalidatePath("/requests")
  redirect("/requests")
}

function normalizeValue(value: FormDataEntryValue) {
  const text = String(value)
  if (text === "true") return true
  if (text === "false") return false
  if (text !== "" && Number.isFinite(Number(text))) return Number(text)
  return text
}
