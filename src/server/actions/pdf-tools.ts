"use server"

import { redirect } from "next/navigation"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import {
  runPdfMergeTool,
  runPdfRemovePagesTool,
  runPdfReorderTool,
  runPdfRotateTool,
  runPdfSplitTool,
  runPdfStampTool,
} from "@/server/services/pdf/pdf-tools-service"

function collectFiles(formData: FormData, fieldName: string) {
  return formData
    .getAll(fieldName)
    .filter((value): value is File => value instanceof File && value.size > 0)
}

export async function mergePdfToolAction(formData: FormData) {
  const user = await requireCurrentAppUser()
  assertUserHasAnyPermission(user, [PERMISSIONS.mdrManage, PERMISSIONS.dcCheck])

  const manifestPath = await runPdfMergeTool(user, collectFiles(formData, "files"))
  redirect(`/pdf-tools?manifest=${encodeURIComponent(manifestPath)}`)
}

export async function splitPdfToolAction(formData: FormData) {
  const user = await requireCurrentAppUser()
  assertUserHasAnyPermission(user, [PERMISSIONS.mdrManage, PERMISSIONS.dcCheck])

  const file = formData.get("file")

  if (!(file instanceof File)) {
    throw new Error("A PDF file is required.")
  }

  const manifestPath = await runPdfSplitTool(user, file)
  redirect(`/pdf-tools?manifest=${encodeURIComponent(manifestPath)}`)
}

export async function removePagesPdfToolAction(formData: FormData) {
  const user = await requireCurrentAppUser()
  assertUserHasAnyPermission(user, [PERMISSIONS.mdrManage, PERMISSIONS.dcCheck])

  const file = formData.get("file")

  if (!(file instanceof File)) {
    throw new Error("A PDF file is required.")
  }

  const manifestPath = await runPdfRemovePagesTool(
    user,
    file,
    String(formData.get("pages") ?? "")
  )
  redirect(`/pdf-tools?manifest=${encodeURIComponent(manifestPath)}`)
}

export async function reorderPdfToolAction(formData: FormData) {
  const user = await requireCurrentAppUser()
  assertUserHasAnyPermission(user, [PERMISSIONS.mdrManage, PERMISSIONS.dcCheck])

  const file = formData.get("file")

  if (!(file instanceof File)) {
    throw new Error("A PDF file is required.")
  }

  const manifestPath = await runPdfReorderTool(
    user,
    file,
    String(formData.get("order") ?? "")
  )
  redirect(`/pdf-tools?manifest=${encodeURIComponent(manifestPath)}`)
}

export async function rotatePdfToolAction(formData: FormData) {
  const user = await requireCurrentAppUser()
  assertUserHasAnyPermission(user, [PERMISSIONS.mdrManage, PERMISSIONS.dcCheck])

  const file = formData.get("file")

  if (!(file instanceof File)) {
    throw new Error("A PDF file is required.")
  }

  const degreesValue =
    formData.get("degreesValue") === "180"
      ? 180
      : formData.get("degreesValue") === "270"
        ? 270
        : 90

  const manifestPath = await runPdfRotateTool({
    user,
    file,
    pages: String(formData.get("pages") ?? ""),
    degreesValue,
  })
  redirect(`/pdf-tools?manifest=${encodeURIComponent(manifestPath)}`)
}

export async function stampPdfToolAction(formData: FormData) {
  const user = await requireCurrentAppUser()
  assertUserHasAnyPermission(user, [PERMISSIONS.mdrManage, PERMISSIONS.dcCheck])

  const file = formData.get("file")

  if (!(file instanceof File)) {
    throw new Error("A PDF file is required.")
  }

  const manifestPath = await runPdfStampTool({
    user,
    file,
    text: String(formData.get("text") ?? ""),
    page: String(formData.get("page") ?? ""),
    x: String(formData.get("x") ?? ""),
    y: String(formData.get("y") ?? ""),
    size: String(formData.get("size") ?? ""),
  })
  redirect(`/pdf-tools?manifest=${encodeURIComponent(manifestPath)}`)
}
