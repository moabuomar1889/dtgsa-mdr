"use server"

import { revalidatePath } from "next/cache"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { updateUserProfile } from "@/server/services/signatures/signature-profile-service"

export async function updateProfileAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await updateUserProfile(actor, {
    fullName: formData.get("fullName"),
    jobTitle: formData.get("jobTitle"),
    timezone: formData.get("timezone"),
    signatureFile: formData.get("signatureFile"),
    initialsFile: formData.get("initialsFile"),
  })

  revalidatePath("/profile")
  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}
