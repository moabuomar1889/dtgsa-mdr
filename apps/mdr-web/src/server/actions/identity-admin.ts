"use server"

import { revalidatePath } from "next/cache"
import {
  ConfiguredPortalInvitationDeliveryAdapter,
  createExternalPortalInvitation,
  replaceExternalPortalInvitation,
  revokeExternalInvitation,
} from "@/server/services/identity/external-portal-service"
import { synchronizeWorkspaceDirectory } from "@/server/services/identity/directory-sync-service"
import { createDirectoryAdapter } from "@/server/services/local/local-provider-factory"
import {
  requireIdentityAdministrator,
  resolveIdentityLinkReview,
} from "@/server/services/identity/identity-admin-service"
import { upsertGoogleGroupMapping } from "@/server/services/identity/role-mapping-service"

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function saveGoogleGroupMappingAction(formData: FormData) {
  const actor = await requireIdentityAdministrator()
  await upsertGoogleGroupMapping(actor.id, {
    groupId: text(formData, "groupId"),
    roleCode: text(formData, "roleCode"),
    projectId: text(formData, "projectId") || null,
    departmentId: text(formData, "departmentId") || null,
    isActive: formData.get("isActive") !== null,
  })
  revalidatePath("/admin/identity")
}

export async function synchronizeDirectoryAction(formData: FormData) {
  await requireIdentityAdministrator()
  const adapter = createDirectoryAdapter()
  await synchronizeWorkspaceDirectory(adapter, {
    dryRun: formData.get("dryRun") !== null,
  })
  revalidatePath("/admin/identity")
}

export async function inviteExternalPortalUserAction(formData: FormData) {
  const actor = await requireIdentityAdministrator()
  await createExternalPortalInvitation(
    actor.id,
    {
      email: text(formData, "email"),
      fullName: text(formData, "fullName"),
      clientId: text(formData, "clientId"),
      projectId: text(formData, "projectId") || undefined,
      pdiItemIds: text(formData, "pdiItemIds")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      usePolicy: text(formData, "usePolicy") || "OneTime",
    },
    new ConfiguredPortalInvitationDeliveryAdapter()
  )
  revalidatePath("/admin/identity")
}

export async function revokeExternalInvitationAction(formData: FormData) {
  const actor = await requireIdentityAdministrator()
  await revokeExternalInvitation(actor.id, text(formData, "invitationId"))
  revalidatePath("/admin/identity")
}

export async function replaceExternalInvitationAction(formData: FormData) {
  const actor = await requireIdentityAdministrator()
  await replaceExternalPortalInvitation(
    actor.id,
    text(formData, "invitationId"),
    new ConfiguredPortalInvitationDeliveryAdapter()
  )
  revalidatePath("/admin/identity")
}

export async function approveIdentityLinkReviewAction(formData: FormData) {
  const actor = await requireIdentityAdministrator()
  await resolveIdentityLinkReview({
    actorUserId: actor.id,
    reviewId: text(formData, "reviewId"),
    selectedUserId: text(formData, "selectedUserId"),
  })
  revalidatePath("/admin/identity")
}
