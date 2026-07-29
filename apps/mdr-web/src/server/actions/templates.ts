"use server"

import { revalidatePath } from "next/cache"
import { CoverSheetKind } from "@prisma/client"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import {
  createCoverSheetTemplate,
  createTransmittalTemplate,
} from "@/server/services/templates/template-management-service"

function toOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}

function toScope(value: FormDataEntryValue | null) {
  if (value === "client" || value === "project") {
    return value
  }

  return "global" as const
}

export async function createCoverTemplateAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.templatesManage)

  const file = formData.get("file")

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A DOCX cover template file is required.")
  }

  await createCoverSheetTemplate({
    actor,
    scope: toScope(formData.get("scope")),
    clientId: toOptionalString(formData.get("clientId")),
    projectId: toOptionalString(formData.get("projectId")),
    kind:
      formData.get("kind") === CoverSheetKind.CLIENT_COVER
        ? CoverSheetKind.CLIENT_COVER
        : CoverSheetKind.DTGSA_COVER,
    name: String(formData.get("name") ?? ""),
    description: toOptionalString(formData.get("description")),
    isDefault: formData.get("isDefault") === "on",
    file,
  })

  revalidatePath("/templates")
  revalidatePath("/settings")
}

export async function createTransmittalTemplateAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.templatesManage)

  const file = formData.get("file")

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A DOCX transmittal template file is required.")
  }

  await createTransmittalTemplate({
    actor,
    scope: toScope(formData.get("scope")),
    clientId: toOptionalString(formData.get("clientId")),
    projectId: toOptionalString(formData.get("projectId")),
    name: String(formData.get("name") ?? ""),
    description: toOptionalString(formData.get("description")),
    isDefault: formData.get("isDefault") === "on",
    file,
  })

  revalidatePath("/templates")
  revalidatePath("/settings")
}
