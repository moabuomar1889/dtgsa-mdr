"use server"

import { revalidatePath } from "next/cache"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import {
  generateMergedRevisionPackage,
  generateRevisionCoverSheets,
} from "@/server/services/mdr/cover-sheet-service"
import { uploadRevisionFile } from "@/server/services/mdr/document-file-service"
import { requestSignedInternalDownload } from "@/server/services/downloads/signed-internal-download-service"

export async function uploadRevisionFileAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await uploadRevisionFile(actor, {
    revisionId: formData.get("revisionId"),
    file: formData.get("file"),
  })

  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function generateRevisionCoverSheetsAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await generateRevisionCoverSheets(
    actor,
    String(formData.get("revisionId") ?? "")
  )

  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function generateMergedRevisionPackageAction(formData: FormData) {
  const actor = await requireCurrentAppUser()

  await generateMergedRevisionPackage(
    actor,
    String(formData.get("revisionId") ?? "")
  )

  revalidatePath("/mdr")
  revalidatePath("/dashboard")
}

export async function requestSignedInternalDownloadAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  await requestSignedInternalDownload(
    actor,
    String(formData.get("revisionId") ?? "")
  )
  revalidatePath("/mdr")
}
