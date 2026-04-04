"use server"

import { revalidatePath } from "next/cache"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { recordClientReply } from "@/server/services/replies/client-reply-service"

export async function recordClientReplyAction(formData: FormData) {
  const user = await requireCurrentAppUser()

  await recordClientReply(user, {
    documentId: formData.get("documentId"),
    reviewCodeId: formData.get("reviewCodeId"),
    nextAction: formData.get("nextAction"),
    transmittalId: formData.get("transmittalId"),
    driveTargetFolderType: formData.get("driveTargetFolderType"),
    replyDate: formData.get("replyDate"),
    comments: formData.get("comments"),
    returnedFileName: formData.get("returnedFileName"),
    file: formData.get("file"),
  })

  revalidatePath("/replies")
  revalidatePath("/mdr")
  revalidatePath("/transmittals")
  revalidatePath("/dashboard")
  revalidatePath("/notifications")
}
