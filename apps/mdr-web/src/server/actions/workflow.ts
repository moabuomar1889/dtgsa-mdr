"use server"

import { revalidatePath } from "next/cache"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import {
  approveRevision,
  dcValidateRevision,
  prepareRevision,
  reviewRevision,
} from "@/server/services/workflow/workflow-service"

export async function prepareRevisionAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await prepareRevision(actor, {
    revisionId: formData.get("revisionId"),
    comments: formData.get("comments"),
  })

  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function reviewApproveRevisionAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await reviewRevision(
    actor,
    {
      revisionId: formData.get("revisionId"),
      comments: formData.get("comments"),
    },
    true
  )

  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function reviewRejectRevisionAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await reviewRevision(
    actor,
    {
      revisionId: formData.get("revisionId"),
      comments: formData.get("comments"),
    },
    false
  )

  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function approveApproveRevisionAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await approveRevision(
    actor,
    {
      revisionId: formData.get("revisionId"),
      comments: formData.get("comments"),
    },
    true
  )

  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function approveRejectRevisionAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await approveRevision(
    actor,
    {
      revisionId: formData.get("revisionId"),
      comments: formData.get("comments"),
    },
    false
  )

  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function dcApproveRevisionAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await dcValidateRevision(
    actor,
    {
      revisionId: formData.get("revisionId"),
      comments: formData.get("comments"),
    },
    true
  )

  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function dcRejectRevisionAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await dcValidateRevision(
    actor,
    {
      revisionId: formData.get("revisionId"),
      comments: formData.get("comments"),
    },
    false
  )

  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}
