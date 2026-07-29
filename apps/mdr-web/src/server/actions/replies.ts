"use server"

import { revalidatePath } from "next/cache"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { recordClientReply } from "@/server/services/replies/client-reply-service"
import {
  createRevisionFromClientResponse,
  registerConfiguredClientResponse,
  requestClientResponseDownload,
} from "@/server/services/replies/client-response-service"

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

export async function registerConfiguredClientResponseAction(
  formData: FormData
) {
  const user = await requireCurrentAppUser()
  await registerConfiguredClientResponse(user, {
    submissionId: formData.get("submissionId"),
    responseCodeId: formData.get("responseCodeId"),
    incomingReference: formData.get("incomingReference"),
    responseDate: formData.get("responseDate"),
    clientReviewerName: formData.get("clientReviewerName"),
    clientReviewerDate: formData.get("clientReviewerDate"),
    primaryFileKind: formData.get("primaryFileKind"),
    comments: formData.get("comments"),
    primaryFile: formData.get("primaryFile"),
    attachments: formData.getAll("attachments"),
  })
  revalidatePath("/replies")
  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function createRevisionFromClientResponseAction(
  formData: FormData
) {
  const user = await requireCurrentAppUser()
  const workingMainPdf = formData.get("workingMainPdf")
  if (!(workingMainPdf instanceof File)) {
    throw new Error("A new working Main PDF is required.")
  }
  await createRevisionFromClientResponse(user, {
    responseId: String(formData.get("responseId") ?? ""),
    workingMainPdf,
    reason: String(formData.get("reason") ?? "") || undefined,
  })
  revalidatePath("/replies")
  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function requestClientResponseDownloadAction(formData: FormData) {
  const user = await requireCurrentAppUser()
  await requestClientResponseDownload(
    user,
    String(formData.get("responseId") ?? "")
  )
  revalidatePath("/replies")
}
