"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/server/services/clients/client-management"
import {
  createGlobalDiscipline,
  createGlobalDocumentType,
  createGlobalReleasePurpose,
  createGlobalReviewCode,
} from "@/server/services/masters/master-data-service"
import { syncSupabaseUsers } from "@/server/services/admin/user-sync-service"
import { createProjectFromDriveFolder } from "@/server/services/projects/project-management"

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true"
}

export async function createClientAction(formData: FormData) {
  await createClient({
    code: formData.get("code"),
    name: formData.get("name"),
    defaultTimezone: formData.get("defaultTimezone"),
    description: formData.get("description"),
  })

  revalidatePath("/clients")
  revalidatePath("/dashboard")
  revalidatePath("/projects/new")
  redirect("/clients")
}

export async function createProjectAction(formData: FormData) {
  await createProjectFromDriveFolder({
    clientId: formData.get("clientId"),
    code: formData.get("code"),
    name: formData.get("name"),
    contractNumber: formData.get("contractNumber"),
    driveFolderId: formData.get("driveFolderId"),
    driveFolderName: formData.get("driveFolderName"),
  })

  revalidatePath("/projects")
  revalidatePath("/projects/new")
  revalidatePath("/dashboard")
  redirect("/projects")
}

export async function createDisciplineAction(formData: FormData) {
  await createGlobalDiscipline({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
  })

  revalidatePath("/masters")
  redirect("/masters")
}

export async function createDocumentTypeAction(formData: FormData) {
  await createGlobalDocumentType({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
  })

  revalidatePath("/masters")
  redirect("/masters")
}

export async function createReleasePurposeAction(formData: FormData) {
  await createGlobalReleasePurpose({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
  })

  revalidatePath("/masters")
  redirect("/masters")
}

export async function createReviewCodeAction(formData: FormData) {
  await createGlobalReviewCode({
    code: formData.get("code"),
    label: formData.get("label"),
    description: formData.get("description"),
    requiresResubmittal: toBoolean(formData.get("requiresResubmittal")),
    finalizesDocument: toBoolean(formData.get("finalizesDocument")),
    informationalOnly: toBoolean(formData.get("informationalOnly")),
  })

  revalidatePath("/masters")
  redirect("/masters")
}

export async function syncSupabaseUsersAction() {
  await syncSupabaseUsers()

  revalidatePath("/admin/users")
  revalidatePath("/dashboard")
  redirect("/admin/users")
}
