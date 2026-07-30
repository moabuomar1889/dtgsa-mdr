import "server-only"

import { TransmittalStatus } from "@prisma/client"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { loadTransmittalOverviewRecords } from "@/server/repositories/transmittals/transmittal-read-repository"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { pickPreferredAttachmentFile } from "@/server/services/transmittals/transmittal-policy"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

export async function getTransmittalOverview(user: CurrentAppUser) {
  requireUserHasAnyPermission(user, PERMISSIONS.transmittalsManage)

  const { projects, eligibleRevisions, transmittals } =
    await loadTransmittalOverviewRecords()

  const mappedEligibleRevisions = eligibleRevisions.map((revision) => {
    const preferredFile = pickPreferredAttachmentFile(revision.files)

    return {
      id: revision.id,
      revisionLabel: revision.revisionLabel,
      projectId: revision.document.projectId,
      documentId: revision.document.id,
      title: revision.document.title,
      dtgsaDocumentNumber: revision.document.dtgsaDocumentNumber,
      clientDocumentNumber: revision.document.clientDocumentNumber,
      attachmentFileName: preferredFile?.fileName ?? null,
      attachmentFileId: preferredFile?.id ?? null,
      attachmentFileSizeBytes: preferredFile?.fileSizeBytes ?? 0,
      project: revision.document.project,
    }
  })

  return {
    projects,
    eligibleRevisions: mappedEligibleRevisions,
    transmittals: await Promise.all(
      transmittals.map(async (transmittal) => ({
        ...transmittal,
        generatedPdfUrl: transmittal.generatedDocuments[0]?.providerKey
          ? `/api/generated-documents/${transmittal.generatedDocuments[0].id}`
          : null,
      }))
    ),
    counts: {
      total: transmittals.length,
      readyToSend: transmittals.filter(
        (item) => item.status === TransmittalStatus.ReadyToSend
      ).length,
      sent: transmittals.filter(
        (item) => item.status === TransmittalStatus.Sent
      ).length,
      eligibleDocuments: mappedEligibleRevisions.length,
    },
  }
}
