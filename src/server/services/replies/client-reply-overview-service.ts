import "server-only"

import { ClientReplyState } from "@prisma/client"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { loadClientReplyOverviewRecords } from "@/server/repositories/replies/client-reply-read-repository"
import { buildApplicableReviewCodes } from "@/server/services/replies/client-reply-policy"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

export async function getClientRepliesOverview(user: CurrentAppUser) {
  const canManageReplies = hasAnyPermission({
    required: PERMISSIONS.clientRepliesManage,
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: user.projectRoles.map((item) => item.role.code),
  })

  if (!canManageReplies) {
    throw new Error("You do not have permission to view client replies.")
  }

  const { documents, replies, reviewCodes, transmittalLinks } =
    await loadClientReplyOverviewRecords()

  const transmittalsByDocument = new Map<
    string,
    Array<{
      id: string
      transmittalNumber: string
      status: string
    }>
  >()

  for (const link of transmittalLinks) {
    const current =
      transmittalsByDocument.get(link.documentRevision.documentId) ?? []

    if (!current.some((item) => item.id === link.transmittal.id)) {
      current.push({
        id: link.transmittal.id,
        transmittalNumber: link.transmittal.transmittalNumber,
        status: link.transmittal.status,
      })
    }

    transmittalsByDocument.set(link.documentRevision.documentId, current)
  }

  const documentsWithOptions = documents.map((document) => ({
    id: document.id,
    projectId: document.projectId,
    projectCode: document.project.code,
    projectName: document.project.name,
    clientCode: document.project.client.code,
    clientName: document.project.client.name,
    dtgsaDocumentNumber: document.dtgsaDocumentNumber,
    clientDocumentNumber: document.clientDocumentNumber,
    title: document.title,
    currentRevisionId: document.currentRevision?.id ?? "",
    currentRevisionLabel: document.currentRevision?.revisionLabel ?? "N/A",
    reviewCodes: buildApplicableReviewCodes(
      document.projectId,
      document.project.client.id,
      reviewCodes
    ),
    transmittals: transmittalsByDocument.get(document.id) ?? [],
  }))

  return {
    documents: documentsWithOptions,
    replies,
    counts: {
      pendingReply: documents.length,
      totalReplies: replies.length,
      revisionRequired: replies.filter(
        (reply) => reply.replyState === ClientReplyState.RevisionRequired
      ).length,
      noFurtherSubmittal: replies.filter(
        (reply) => reply.replyState === ClientReplyState.NoFurtherSubmittal
      ).length,
    },
  }
}
