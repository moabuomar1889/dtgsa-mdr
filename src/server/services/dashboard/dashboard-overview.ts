import { ClientReplyState, PdiStatus, TransmittalStatus, WorkflowStatus } from "@prisma/client"
import "server-only"
import { prisma } from "@/lib/prisma/client"
import { getGoogleDriveIntegrationDiagnostic } from "@/server/services/integrations/google-drive-diagnostics"

export async function getDashboardOverview() {
  const [
    clientCount,
    projectCount,
    disciplineCount,
    documentTypeCount,
    reviewCodeCount,
    numberingRuleCount,
    pendingPdiCount,
    mdrCount,
    readyToSubmitCount,
    submittedCount,
    pendingReplyCount,
    readyTransmittalCount,
    googleDrive,
  ] = await Promise.all([
    prisma.client.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.project.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.discipline.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.documentTypeCategory.count(),
    prisma.reviewCode.count(),
    prisma.numberingRule.count(),
    prisma.pdiItem.count({
      where: {
        deletedAt: null,
        status: {
          in: [PdiStatus.SentToClient, PdiStatus.ClientNumberPending],
        },
      },
    }),
    prisma.mdrDocument.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.documentRevision.count({
      where: {
        deletedAt: null,
        isCurrent: true,
        workflowStatus: WorkflowStatus.ReadyToSubmit,
      },
    }),
    prisma.documentRevision.count({
      where: {
        deletedAt: null,
        isCurrent: true,
        workflowStatus: WorkflowStatus.SubmittedToClient,
      },
    }),
    prisma.mdrDocument.count({
      where: {
        deletedAt: null,
        currentClientReplyState: ClientReplyState.WaitingClientReply,
      },
    }),
    prisma.transmittal.count({
      where: {
        deletedAt: null,
        status: TransmittalStatus.ReadyToSend,
      },
    }),
    getGoogleDriveIntegrationDiagnostic(),
  ])

  return {
    clientCount,
    projectCount,
    disciplineCount,
    documentTypeCount,
    reviewCodeCount,
    numberingRuleCount,
    pendingPdiCount,
    mdrCount,
    readyToSubmitCount,
    submittedCount,
    pendingReplyCount,
    readyTransmittalCount,
    googleDrive,
  }
}
