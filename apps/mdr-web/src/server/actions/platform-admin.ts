"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ProjectOnboardingActionState } from "@/lib/forms/project-onboarding"
import {
  projectOnboardingValidationState,
  validateProjectOnboardingInput,
} from "@/lib/forms/project-onboarding"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import { createClient } from "@/server/services/clients/client-management"
import {
  createGlobalDiscipline,
  createGlobalDocumentType,
  createGlobalReleasePurpose,
  createGlobalReviewCode,
} from "@/server/services/masters/master-data-service"
import {
  createProjectFromDriveFolder,
  ProjectCodeConflictError,
  ProjectDriveFolderConflictError,
} from "@/server/services/projects/project-management"

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true"
}

export async function createClientAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.clientsManage)

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

export async function createProjectAction(
  _previousState: ProjectOnboardingActionState,
  formData: FormData
): Promise<ProjectOnboardingActionState> {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.projectsManage)

  const validated = validateProjectOnboardingInput({
    clientId: formData.get("clientId"),
    code: formData.get("code"),
    name: formData.get("name"),
    contractNumber: formData.get("contractNumber"),
    driveFolderId: formData.get("driveFolderId"),
    driveFolderName: formData.get("driveFolderName"),
  })

  if (!validated.success) {
    return projectOnboardingValidationState(validated.error)
  }

  try {
    await createProjectFromDriveFolder(validated.data)
  } catch (error) {
    if (error instanceof ProjectDriveFolderConflictError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {
          driveFolderId: [error.message],
        },
      }
    }

    if (error instanceof ProjectCodeConflictError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: {
          code: [error.message],
        },
      }
    }

    throw error
  }

  revalidatePath("/projects")
  revalidatePath("/projects/new")
  revalidatePath("/dashboard")
  redirect("/projects")
}

export async function createDisciplineAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.mastersManage)

  await createGlobalDiscipline({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
  })

  revalidatePath("/masters")
  redirect("/masters")
}

export async function createDocumentTypeAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.mastersManage)

  await createGlobalDocumentType({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
  })

  revalidatePath("/masters")
  redirect("/masters")
}

export async function createReleasePurposeAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.mastersManage)

  await createGlobalReleasePurpose({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
  })

  revalidatePath("/masters")
  redirect("/masters")
}

export async function createReviewCodeAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  assertUserHasAnyPermission(actor, PERMISSIONS.mastersManage)

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
