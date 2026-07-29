import {
  ClientReplyState,
  RevisionStatus,
  WorkflowStatus,
  WorkflowStepType,
} from "@prisma/client"

export const INTERNAL_WORKFLOW_SEQUENCE = [
  WorkflowStatus.Draft,
  WorkflowStatus.Uploaded,
  WorkflowStatus.PendingReview,
  WorkflowStatus.ReviewRejected,
  WorkflowStatus.PendingApproval,
  WorkflowStatus.ApprovalRejected,
  WorkflowStatus.ReadyForDcCheck,
  WorkflowStatus.DcReturnedForCorrection,
  WorkflowStatus.ReadyToSubmit,
  WorkflowStatus.SubmittedToClient,
] as const

export const SIGNATURE_REQUIRED_STEPS = [
  WorkflowStepType.Prepared,
  WorkflowStepType.Reviewed,
  WorkflowStepType.Approved,
] as const

export const CLIENT_REPLY_TERMINAL_STATES = [
  ClientReplyState.NoFurtherSubmittal,
  ClientReplyState.InformationOnly,
] as const

type SubmissionGuardInput = {
  workflowStatus: WorkflowStatus
  preparedSigned: boolean
  reviewedSigned: boolean
  approvedSigned: boolean
}

type DocumentLockInput = {
  revisionStatus: RevisionStatus
  clientReplyState: ClientReplyState
  reviewCodeFinalizesDocument?: boolean
  reviewCodeInformationalOnly?: boolean
  revisionTriggered?: boolean
  manualFollowUpStarted?: boolean
}

export function canSubmitForDcCheck(workflowStatus: WorkflowStatus) {
  return workflowStatus === WorkflowStatus.ReadyForDcCheck
}

export function canSubmitToClient({
  workflowStatus,
  preparedSigned,
  reviewedSigned,
  approvedSigned,
}: SubmissionGuardInput) {
  return (
    workflowStatus === WorkflowStatus.ReadyToSubmit &&
    preparedSigned &&
    reviewedSigned &&
    approvedSigned
  )
}

export function isDocumentLocked({
  revisionStatus,
  clientReplyState,
  reviewCodeFinalizesDocument = false,
  reviewCodeInformationalOnly = false,
  revisionTriggered = false,
  manualFollowUpStarted = false,
}: DocumentLockInput) {
  if (revisionStatus === RevisionStatus.Closed) {
    return true
  }

  if (reviewCodeFinalizesDocument && !revisionTriggered) {
    return true
  }

  if (
    clientReplyState === ClientReplyState.NoFurtherSubmittal &&
    !revisionTriggered
  ) {
    return true
  }

  if (
    (reviewCodeInformationalOnly ||
      clientReplyState === ClientReplyState.InformationOnly) &&
    !manualFollowUpStarted
  ) {
    return true
  }

  return false
}
