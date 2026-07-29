"use server"

import { revalidatePath } from "next/cache"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import {
  addResponseCode,
  cloneResponsePolicyToProject,
  createNextResponseCodeVersion,
  createResponseCodeSetDraft,
  publishResponseCodeVersion,
  removeResponseCode,
  reorderResponseCode,
  uploadResponseCodeReference,
} from "@/server/services/replies/client-response-policy-service"

const checked = (formData: FormData, key: string) => formData.get(key) === "on"

function revalidatePolicies() {
  revalidatePath("/settings/response-codes")
  revalidatePath("/replies")
}

export async function createResponseCodeSetAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  await createResponseCodeSetDraft(actor, {
    clientId: formData.get("clientId"),
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    fixture: formData.get("fixture"),
  })
  revalidatePolicies()
}

export async function cloneResponsePolicyAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  await cloneResponsePolicyToProject(actor, {
    sourceVersionId: formData.get("sourceVersionId"),
    projectId: formData.get("projectId"),
  })
  revalidatePolicies()
}

export async function createNextResponseCodeVersionAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  await createNextResponseCodeVersion(
    actor,
    String(formData.get("codeSetId") ?? "")
  )
  revalidatePolicies()
}

export async function addResponseCodeAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  await addResponseCode(actor, {
    versionId: formData.get("versionId"),
    externalCode: formData.get("externalCode"),
    exactWording: formData.get("exactWording"),
    internalLabel: formData.get("internalLabel"),
    outcomeClass: formData.get("outcomeClass"),
    expectedPrimaryFileKind:
      formData.get("expectedPrimaryFileKind") || undefined,
    displayOrder: formData.get("displayOrder"),
    countsAsApproved: checked(formData, "countsAsApproved"),
    finalApproval: checked(formData, "finalApproval"),
    requiresCommentRectification: checked(
      formData,
      "requiresCommentRectification"
    ),
    requiresNewRevision: checked(formData, "requiresNewRevision"),
    requiresInternalReapproval: checked(formData, "requiresInternalReapproval"),
    requiresResubmission: checked(formData, "requiresResubmission"),
    allowsTemporaryUse: checked(formData, "allowsTemporaryUse"),
    allowsLifecycleClosure: checked(formData, "allowsLifecycleClosure"),
    requiresNewDocumentNumber: checked(formData, "requiresNewDocumentNumber"),
    requiresReturnedFile: checked(formData, "requiresReturnedFile"),
  })
  revalidatePolicies()
}

export async function removeResponseCodeAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  await removeResponseCode(actor, String(formData.get("codeId") ?? ""))
  revalidatePolicies()
}

export async function reorderResponseCodeAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  await reorderResponseCode(actor, {
    codeId: String(formData.get("codeId") ?? ""),
    direction: formData.get("direction") === "UP" ? "UP" : "DOWN",
  })
  revalidatePolicies()
}

export async function uploadResponseCodeReferenceAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    throw new Error("A reference file is required.")
  }
  await uploadResponseCodeReference(actor, {
    codeSetId: String(formData.get("codeSetId") ?? ""),
    referenceKind: String(formData.get("referenceKind") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    file,
  })
  revalidatePolicies()
}

export async function publishResponsePolicyAction(formData: FormData) {
  const actor = await requireCurrentAppUser()
  await publishResponseCodeVersion(actor, {
    versionId: formData.get("versionId"),
    projectId: formData.get("projectId") || undefined,
  })
  revalidatePolicies()
}
