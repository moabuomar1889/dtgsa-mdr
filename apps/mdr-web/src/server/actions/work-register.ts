"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  workRegisterCommentSchema,
  workRegisterCreateSchema,
  workRegisterUpdateSchema,
  type WorkRegisterCreateActionState,
} from "@/lib/forms/work-register"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import {
  addWorkRegisterComment,
  createWorkRegisterItem,
  updateWorkRegisterItem,
} from "@/server/services/work-register/work-register-service"

export async function createWorkRegisterItemAction(
  _previousState: WorkRegisterCreateActionState,
  formData: FormData
): Promise<WorkRegisterCreateActionState> {
  const actor = await requireCurrentAppUser()
  const validated = workRegisterCreateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    area: formData.get("area"),
    category: formData.get("category"),
    priority: formData.get("priority"),
  })
  if (!validated.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: validated.error.flatten().fieldErrors,
    }
  }

  const item = await createWorkRegisterItem(actor, validated.data)
  revalidatePath("/work-register")
  redirect(`/work-register?created=${item.id}#item-${item.id}`)
}

export async function addWorkRegisterCommentAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  const itemId = String(formData.get("itemId") ?? "")
  const validated = workRegisterCommentSchema.safeParse({
    itemId,
    body: formData.get("body"),
  })
  if (!validated.success) {
    const message = validated.error.issues[0]?.message ?? "Check the comment."
    redirect(
      `/work-register?error=${encodeURIComponent(message)}#item-${itemId}`
    )
  }
  await addWorkRegisterComment(actor, validated.data)
  revalidatePath("/work-register")
  redirect(`/work-register#item-${itemId}`)
}

export async function updateWorkRegisterItemAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  const itemId = String(formData.get("itemId") ?? "")
  const validated = workRegisterUpdateSchema.safeParse({
    itemId,
    status: formData.get("status"),
    priority: formData.get("priority"),
    category: formData.get("category"),
    workPack: formData.get("workPack"),
    assigneeUserId: formData.get("assigneeUserId"),
    rootCause: formData.get("rootCause"),
    fixSummary: formData.get("fixSummary"),
    fileReferences: formData.get("fileReferences"),
    testEvidence: formData.get("testEvidence"),
    commitSha: formData.get("commitSha"),
    deploymentStatus: formData.get("deploymentStatus"),
    remainingRisks: formData.get("remainingRisks"),
    updateNote: formData.get("updateNote"),
  })
  if (!validated.success) {
    const message =
      validated.error.issues[0]?.message ?? "Check the implementation evidence."
    redirect(
      `/work-register?error=${encodeURIComponent(message)}#item-${itemId}`
    )
  }
  await updateWorkRegisterItem(actor, validated.data)
  revalidatePath("/work-register")
  redirect(`/work-register#item-${itemId}`)
}
