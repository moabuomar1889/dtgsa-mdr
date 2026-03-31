"use server"

import { revalidatePath } from "next/cache"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import {
  createTransmittal,
  sendTransmittal,
} from "@/server/services/transmittals/transmittal-service"

export async function createTransmittalAction(formData: FormData) {
  const user = await requireCurrentAppUser()

  await createTransmittal(user, {
    projectId: formData.get("projectId"),
    revisionIds: formData.getAll("revisionIds").map((value) => String(value)),
    subject: formData.get("subject"),
    purpose: formData.get("purpose"),
    fromText: formData.get("fromText"),
    toText: formData.get("toText"),
    ccText: formData.get("ccText"),
    attention: formData.get("attention"),
    messageBody: formData.get("messageBody"),
    respondByDate: formData.get("respondByDate"),
  })

  revalidatePath("/transmittals")
  revalidatePath("/dashboard")
  revalidatePath("/mdr")
}

export async function sendTransmittalAction(formData: FormData) {
  const user = await requireCurrentAppUser()

  await sendTransmittal(user, {
    transmittalId: formData.get("transmittalId"),
  })

  revalidatePath("/transmittals")
  revalidatePath("/dashboard")
  revalidatePath("/mdr")
  revalidatePath("/notifications")
}
