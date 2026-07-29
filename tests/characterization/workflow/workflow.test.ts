import assert from "node:assert/strict"
import test from "node:test"
import {
  ClientReplyState,
  RevisionStatus,
  WorkflowStatus,
  WorkflowStepType,
} from "@prisma/client"
import {
  INTERNAL_WORKFLOW_SEQUENCE,
  SIGNATURE_REQUIRED_STEPS,
  canSubmitForDcCheck,
  canSubmitToClient,
  isDocumentLocked,
} from "../../../src/lib/workflow/constants"

test("workflow sequence preserves the current fixed statuses and rejection states", () => {
  assert.deepEqual(INTERNAL_WORKFLOW_SEQUENCE, [
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
  ])
})

test("prepared, reviewed, and approved remain the required signature steps", () => {
  assert.deepEqual(SIGNATURE_REQUIRED_STEPS, [
    WorkflowStepType.Prepared,
    WorkflowStepType.Reviewed,
    WorkflowStepType.Approved,
  ])
})

test("DC check is allowed only at ReadyForDcCheck", () => {
  assert.equal(canSubmitForDcCheck(WorkflowStatus.ReadyForDcCheck), true)
  assert.equal(canSubmitForDcCheck(WorkflowStatus.PendingApproval), false)
})

test("client submission requires ReadyToSubmit and all three signatures", () => {
  assert.equal(
    canSubmitToClient({
      workflowStatus: WorkflowStatus.ReadyToSubmit,
      preparedSigned: true,
      reviewedSigned: true,
      approvedSigned: true,
    }),
    true
  )

  for (const missing of [
    "preparedSigned",
    "reviewedSigned",
    "approvedSigned",
  ] as const) {
    assert.equal(
      canSubmitToClient({
        workflowStatus: WorkflowStatus.ReadyToSubmit,
        preparedSigned: true,
        reviewedSigned: true,
        approvedSigned: true,
        [missing]: false,
      }),
      false
    )
  }
})

test("closed and finalized revisions are locked until a revision is triggered", () => {
  assert.equal(
    isDocumentLocked({
      revisionStatus: RevisionStatus.Closed,
      clientReplyState: ClientReplyState.ReplyReceived,
    }),
    true
  )
  assert.equal(
    isDocumentLocked({
      revisionStatus: RevisionStatus.Original,
      clientReplyState: ClientReplyState.NoFurtherSubmittal,
      reviewCodeFinalizesDocument: true,
      revisionTriggered: false,
    }),
    true
  )
  assert.equal(
    isDocumentLocked({
      revisionStatus: RevisionStatus.Original,
      clientReplyState: ClientReplyState.NoFurtherSubmittal,
      reviewCodeFinalizesDocument: true,
      revisionTriggered: true,
    }),
    false
  )
})

test("information-only replies remain locked until manual follow-up starts", () => {
  const base = {
    revisionStatus: RevisionStatus.Original,
    clientReplyState: ClientReplyState.InformationOnly,
    reviewCodeInformationalOnly: true,
  }

  assert.equal(isDocumentLocked(base), true)
  assert.equal(
    isDocumentLocked({ ...base, manualFollowUpStarted: true }),
    false
  )
})
