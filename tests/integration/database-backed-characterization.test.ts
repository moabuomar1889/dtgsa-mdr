import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { after, beforeEach, test } from "node:test"
import {
  ClientReplyNextAction,
  ClientReplyState,
  CommentState,
  FoundationRecordStatus,
  NotificationChannel,
  NotificationStatus,
  PdiStatus,
  RevisionStatus,
  StorageProvider,
  TransmittalStatus,
  WorkflowStatus,
  WorkflowStepStatus,
} from "@prisma/client"
import { prisma } from "@/lib/prisma/client"
import { getDashboardOverview } from "@/server/services/dashboard/dashboard-overview"
import { generateDocumentNumber } from "@/server/services/numbering/document-numbering-service"
import {
  createPdiItem,
  markPdiItemSentToClient,
  promotePdiItemToMdr,
  updatePdiClientDocumentNumber,
} from "@/server/services/pdi/pdi-service"
import { recordClientReply } from "@/server/services/replies/client-reply-service"
import { getReportingOverview } from "@/server/services/reports/reporting-service"
import { searchPlatform } from "@/server/services/search/global-search-service"
import { getTaskDashboard } from "@/server/services/tasks/task-dashboard-service"
import {
  createTransmittal,
  deliverTransmittalNow,
  sendTransmittal,
  type TransmittalDeliveryAdapters,
} from "@/server/services/transmittals/transmittal-service"
import {
  approveRevision,
  dcValidateRevision,
  prepareRevision,
  reviewRevision,
} from "@/server/services/workflow/workflow-service"
import {
  createCharacterizationBaseline,
  createDocumentFixture,
  resetCharacterizationDatabase,
} from "../fixtures/database/characterization-fixtures"
import {
  assertSafeTestDatabaseUrl,
  redactTestDatabaseUrl,
} from "../helpers/database-safety.mjs"
import {
  FakeWorkspaceDirectoryAdapter,
  hashOpaqueToken,
} from "../../packages/identity-domain/src/index"
import {
  FakePortalInvitationDeliveryAdapter,
  assertExternalPortalScope,
  createExternalPortalInvitation,
  redeemExternalPortalInvitation,
  revokeExternalInvitation,
} from "@/server/services/identity/external-portal-service"
import { synchronizeWorkspaceDirectory } from "@/server/services/identity/directory-sync-service"
import { upsertGoogleGroupMapping } from "@/server/services/identity/role-mapping-service"
import { FakeDriveStorageAdapter } from "../../packages/controlled-storage-domain/src/index"
import {
  beginPickerSelection,
  processControlledCopyJob,
  reserveControlledMainFile,
} from "@/server/services/drive/controlled-drive-service"
import { reconcileControlledDrive } from "@/server/services/drive/drive-reconciliation-service"
import { openControlledFile } from "@/server/services/drive/controlled-file-delivery"
import { PDFDocument } from "pdf-lib"
import {
  createWorkflowDraft,
  invalidateCycleForContentChange,
  approveSeparationOverride,
  publishWorkflowVersion,
  recordWorkflowDecision,
  reassignWorkflowStep,
  requestSeparationOverride,
  startApprovalCycle,
} from "@/server/services/workflow/approval-engine-service"
import { DEFAULT_ENGINEERING_WORKFLOW } from "../../packages/workflow-engine-domain/src/index"
import {
  DEFAULT_COVER_TEMPLATE,
  type CoverTemplateDocument,
} from "../../packages/cover-designer/src/index"
import {
  archiveVisualCoverVersion,
  createVisualCoverDraft,
  getProjectResponseLegend,
  publishVisualCoverVersion,
  resolvePublishedVisualCover,
  saveVisualCoverDraft,
} from "@/server/services/templates/visual-cover-template-service"
import { createPrismaJobStore } from "../../apps/worker/src/prisma-job-store"
import { responsePolicySnapshot } from "@dtg/client-response-domain"
import {
  resolvePublishedResponsePolicy,
  toDefinition,
} from "@/server/services/replies/client-response-policy-service"
import {
  TEST_PUBLIC_KEY,
  TestPlatformSealProvider,
} from "../../packages/trust-domain/src/index"
import { issueUnpredictableVerificationCode } from "@dtg/verification-domain"
import { verifyPublicCode } from "../../apps/verify-web/src/lib/verify"

const testDatabaseUrl = process.env.TEST_DATABASE_URL

assertSafeTestDatabaseUrl(testDatabaseUrl)

beforeEach(resetCharacterizationDatabase)
after(async () => {
  await prisma.$disconnect()
})

function pdiInput(
  baseline: Awaited<ReturnType<typeof createCharacterizationBaseline>>,
  title: string
) {
  return {
    projectId: baseline.project.id,
    disciplineId: baseline.discipline.id,
    documentTypeCategoryId: baseline.documentType.id,
    releasePurposeId: baseline.releasePurpose.id,
    title,
    revision: "00",
    createdByUserId: baseline.actor.id,
  }
}

function numberingInput(
  baseline: Awaited<ReturnType<typeof createCharacterizationBaseline>>,
  db: Parameters<typeof generateDocumentNumber>[0]["db"],
  project = baseline.project
) {
  return {
    db,
    project: {
      id: project.id,
      code: project.code,
      client: {
        id: baseline.client.id,
        code: baseline.client.code,
      },
    },
    discipline: baseline.discipline,
    documentTypeCategory: baseline.documentType,
    releasePurpose: baseline.releasePurpose,
    revision: "00",
  }
}

test("database safety gate approves only the disposable local test database", () => {
  const summary = redactTestDatabaseUrl(testDatabaseUrl!)
  const password = new URL(testDatabaseUrl!).password
  assert.match(summary, /127\.0\.0\.1/)
  assert.match(summary, /characterization_test/)
  assert.match(summary, /<redacted>/)
  assert.ok(password.length > 0)
  assert.equal(summary.includes(password), false)
})

test("numbering transactions preserve atomic allocation, scope, constraints, and rollback", async () => {
  const baseline = await createCharacterizationBaseline()
  const allocations = await Promise.all(
    Array.from({ length: 4 }, () =>
      prisma.$transaction((tx) =>
        generateDocumentNumber(numberingInput(baseline, tx))
      )
    )
  )

  assert.equal(
    new Set(allocations.map((item) => item.dtgsaDocumentNumber)).size,
    4
  )
  assert.deepEqual(allocations.map((item) => item.dtgsaDocumentNumber).sort(), [
    "TPR-TST-DWG-001",
    "TPR-TST-DWG-002",
    "TPR-TST-DWG-003",
    "TPR-TST-DWG-004",
  ])

  const firstSequence = await prisma.numberingSequence.findFirstOrThrow({
    where: { ruleId: baseline.numberingRule.id },
  })
  assert.equal(firstSequence.currentValue, 4)

  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await generateDocumentNumber(numberingInput(baseline, tx))
      throw new Error("synthetic rollback")
    }),
    /synthetic rollback/
  )
  assert.equal(
    (
      await prisma.numberingSequence.findUniqueOrThrow({
        where: {
          ruleId_scopeKey: {
            ruleId: baseline.numberingRule.id,
            scopeKey: firstSequence.scopeKey,
          },
        },
      })
    ).currentValue,
    4
  )

  const otherNumber = await prisma.$transaction((tx) =>
    generateDocumentNumber(numberingInput(baseline, tx, baseline.otherProject))
  )
  assert.equal(otherNumber.dtgsaDocumentNumber, "OTH-TST-DWG-001")
  assert.equal(await prisma.numberingSequence.count(), 2)

  const register = await prisma.pdiRegister.create({
    data: { projectId: baseline.project.id },
  })
  await prisma.pdiItem.create({
    data: {
      registerId: register.id,
      projectId: baseline.project.id,
      disciplineId: baseline.discipline.id,
      dtgsaDocumentNumber: allocations[0].dtgsaDocumentNumber,
      title: "Original",
    },
  })
  await assert.rejects(
    prisma.pdiItem.create({
      data: {
        registerId: register.id,
        projectId: baseline.project.id,
        disciplineId: baseline.discipline.id,
        dtgsaDocumentNumber: allocations[0].dtgsaDocumentNumber,
        title: "Duplicate",
      },
    }),
    /Unique constraint/
  )
})

test("PDI persistence enforces transitions, idempotency, and promotion eligibility", async () => {
  const baseline = await createCharacterizationBaseline()
  const pdi = await createPdiItem(pdiInput(baseline, "Ungated promotion"))
  assert.equal(pdi.status, PdiStatus.Draft)

  await assert.rejects(
    promotePdiItemToMdr({ pdiItemId: pdi.id }),
    /only after the official client document number/
  )

  const stateWrite = await markPdiItemSentToClient({ pdiItemId: pdi.id })
  assert.equal(stateWrite.status, PdiStatus.ClientNumberPending)
  const repeatedSend = await markPdiItemSentToClient({ pdiItemId: pdi.id })
  assert.equal(repeatedSend.status, PdiStatus.ClientNumberPending)
  assert.equal(
    await prisma.auditLog.count({
      where: { action: "pdi.item.sent_to_client", entityId: pdi.id },
    }),
    1
  )

  const numbered = await updatePdiClientDocumentNumber({
    pdiItemId: pdi.id,
    clientDocumentNumber: "CLIENT-001",
  })
  assert.equal(numbered.status, PdiStatus.ClientNumberReceived)
  await updatePdiClientDocumentNumber({
    pdiItemId: pdi.id,
    clientDocumentNumber: "CLIENT-001",
  })
  assert.equal(
    await prisma.auditLog.count({
      where: { action: "pdi.item.client_number.update", entityId: pdi.id },
    }),
    1
  )

  const document = await promotePdiItemToMdr({ pdiItemId: pdi.id })
  const stored = await prisma.mdrDocument.findUniqueOrThrow({
    where: { id: document.id },
    include: {
      sourcePdiItem: true,
      currentRevision: { include: { workflowSteps: true } },
    },
  })
  assert.equal(stored.sourcePdiItemId, pdi.id)
  assert.equal(stored.title, pdi.title)
  assert.equal(stored.currentRevision?.revisionLabel, "00")
  assert.equal(stored.currentRevision?.workflowSteps.length, 4)
  assert.equal(stored.sourcePdiItem?.status, PdiStatus.ConvertedToMdr)
  assert.equal(
    await prisma.auditLog.count({
      where: { action: "pdi.item.promote_to_mdr", entityId: pdi.id },
    }),
    1
  )

  await assert.rejects(
    promotePdiItemToMdr({ pdiItemId: pdi.id }),
    /already been promoted/
  )
  assert.equal(await prisma.mdrDocument.count(), 1)

  await assert.rejects(
    markPdiItemSentToClient({ pdiItemId: pdi.id }),
    /not allowed/
  )

  const rollbackItem = await createPdiItem(
    pdiInput(baseline, "Promotion rollback")
  )
  await markPdiItemSentToClient({ pdiItemId: rollbackItem.id })
  await updatePdiClientDocumentNumber({
    pdiItemId: rollbackItem.id,
    clientDocumentNumber: "CLIENT-ROLLBACK",
  })
  await prisma.mdrDocument.create({
    data: {
      projectId: baseline.project.id,
      disciplineId: baseline.discipline.id,
      dtgsaDocumentNumber: rollbackItem.dtgsaDocumentNumber,
      title: "Conflicting document",
    },
  })
  const revisionCount = await prisma.documentRevision.count()
  await assert.rejects(
    promotePdiItemToMdr({ pdiItemId: rollbackItem.id }),
    /Unique constraint/
  )
  assert.equal(await prisma.documentRevision.count(), revisionCount)
  assert.equal(
    (await prisma.pdiItem.findUniqueOrThrow({ where: { id: rollbackItem.id } }))
      .status,
    PdiStatus.ClientNumberReceived
  )
})

test("workflow persistence records signatures, actions, transitions, returns, and rollback", async () => {
  const baseline = await createCharacterizationBaseline()
  const main = await createDocumentFixture(baseline)

  await prepareRevision(baseline.actor, { revisionId: main.revision.id })
  await reviewRevision(
    baseline.actor,
    { revisionId: main.revision.id, comments: "Reviewed" },
    true
  )
  await approveRevision(baseline.actor, { revisionId: main.revision.id }, true)
  await dcValidateRevision(
    baseline.actor,
    { revisionId: main.revision.id },
    true
  )

  const completed = await prisma.documentRevision.findUniqueOrThrow({
    where: { id: main.revision.id },
    include: { workflowSteps: true, workflowActions: true },
  })
  assert.equal(completed.workflowStatus, WorkflowStatus.ReadyToSubmit)
  assert.equal(completed.workflowActions.length, 4)
  assert.equal(await prisma.signatureEvent.count(), 3)
  assert.equal(
    completed.workflowSteps.filter(
      (step) => step.status === WorkflowStepStatus.Approved
    ).length,
    4
  )

  await reviewRevision(baseline.actor, { revisionId: main.revision.id }, true)
  assert.equal(await prisma.signatureEvent.count(), 4)

  const rejected = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-901",
  })
  await prepareRevision(baseline.actor, { revisionId: rejected.revision.id })
  await reviewRevision(
    baseline.actor,
    { revisionId: rejected.revision.id },
    false
  )
  assert.equal(
    (
      await prisma.documentRevision.findUniqueOrThrow({
        where: { id: rejected.revision.id },
      })
    ).workflowStatus,
    WorkflowStatus.ReviewRejected
  )

  const returned = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-902",
    workflowStatus: WorkflowStatus.ReadyForDcCheck,
  })
  await dcValidateRevision(
    baseline.actor,
    { revisionId: returned.revision.id },
    false
  )
  assert.equal(
    (
      await prisma.documentRevision.findUniqueOrThrow({
        where: { id: returned.revision.id },
      })
    ).workflowStatus,
    WorkflowStatus.DcReturnedForCorrection
  )

  const rollback = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-903",
  })
  const actorWithoutSignature = {
    ...baseline.actor,
    signatureProfile: null,
  }
  await assert.rejects(
    prepareRevision(actorWithoutSignature, {
      revisionId: rollback.revision.id,
    }),
    /signature image/
  )
  assert.equal(
    await prisma.workflowAction.count({
      where: { documentRevisionId: rollback.revision.id },
    }),
    0
  )
})

test("client reply and revision lineage transactions preserve links, multiple replies, and rollback", async () => {
  const baseline = await createCharacterizationBaseline()
  const submitted = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-910",
    workflowStatus: WorkflowStatus.SubmittedToClient,
  })

  await recordClientReply(baseline.actor, {
    documentId: submitted.document.id,
    reviewCodeId: baseline.informationCode.id,
    nextAction: ClientReplyNextAction.NO_FURTHER_ACTION,
    transmittalId: undefined,
    driveTargetFolderType: undefined,
    replyDate: baseline.fixedDate,
    comments: "Information response",
    returnedFileName: "client-comment.pdf",
  })
  await recordClientReply(baseline.actor, {
    documentId: submitted.document.id,
    reviewCodeId: baseline.informationCode.id,
    nextAction: ClientReplyNextAction.NO_FURTHER_ACTION,
    transmittalId: undefined,
    driveTargetFolderType: undefined,
    replyDate: baseline.fixedDate,
    comments: "Second response",
    returnedFileName: undefined,
  })
  const replies = await prisma.clientReply.findMany({
    where: { documentId: submitted.document.id },
    orderBy: { createdAt: "asc" },
  })
  assert.equal(replies.length, 2)
  assert.equal(replies[0].reviewCodeId, baseline.informationCode.id)
  assert.equal(replies[0].documentRevisionId, submitted.revision.id)
  assert.equal(replies[0].replyState, ClientReplyState.InformationOnly)
  assert.equal(replies[0].driveFileName, "client-comment.pdf")
  assert.equal(
    await prisma.auditLog.count({ where: { action: "client_reply.record" } }),
    2
  )

  const replyCount = await prisma.clientReply.count()
  await assert.rejects(
    recordClientReply(baseline.actor, {
      documentId: submitted.document.id,
      reviewCodeId: baseline.informationCode.id,
      nextAction: ClientReplyNextAction.NO_FURTHER_ACTION,
      transmittalId: "missing-transmittal",
      driveTargetFolderType: undefined,
      replyDate: baseline.fixedDate,
      comments: undefined,
      returnedFileName: undefined,
    }),
    /does not contain/
  )
  assert.equal(await prisma.clientReply.count(), replyCount)

  const lineageSource = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-911",
    workflowStatus: WorkflowStatus.SubmittedToClient,
  })
  await recordClientReply(baseline.actor, {
    documentId: lineageSource.document.id,
    reviewCodeId: baseline.revisionRequiredCode.id,
    nextAction: ClientReplyNextAction.REVISION_REQUIRED,
    transmittalId: undefined,
    driveTargetFolderType: undefined,
    replyDate: baseline.fixedDate,
    comments: "Revise and resubmit",
    returnedFileName: undefined,
  })
  const current = await prisma.documentRevision.findFirstOrThrow({
    where: { documentId: lineageSource.document.id, isCurrent: true },
    include: { workflowSteps: true },
  })
  const lineageReply = await prisma.clientReply.findFirstOrThrow({
    where: { documentId: lineageSource.document.id },
    orderBy: { createdAt: "desc" },
  })
  assert.equal(current.revisionLabel, "01")
  assert.equal(current.parentRevisionId, lineageSource.revision.id)
  assert.equal(current.sourceClientReplyId, lineageReply.id)
  assert.equal(current.workflowSteps.length, 4)
  assert.ok(current.workflowSteps.every((step) => !step.signatureEventId))
  assert.equal(
    (
      await prisma.documentRevision.findUniqueOrThrow({
        where: { id: lineageSource.revision.id },
      })
    ).revisionStatus,
    RevisionStatus.Superseded
  )

  const replacementSource = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-912",
    workflowStatus: WorkflowStatus.SubmittedToClient,
  })
  await recordClientReply(baseline.actor, {
    documentId: replacementSource.document.id,
    reviewCodeId: baseline.revisionRequiredCode.id,
    nextAction: ClientReplyNextAction.NEW_DOCUMENT_NUMBER_REQUIRED,
    transmittalId: undefined,
    driveTargetFolderType: undefined,
    replyDate: baseline.fixedDate,
    comments: "Replace document number",
    returnedFileName: undefined,
  })
  const replacement = await prisma.documentRevision.findFirstOrThrow({
    where: {
      sourceClientReply: { documentId: replacementSource.document.id },
      documentId: { not: replacementSource.document.id },
    },
    include: { document: true, workflowSteps: true },
  })
  assert.notEqual(
    replacement.document.dtgsaDocumentNumber,
    replacementSource.document.dtgsaDocumentNumber
  )
  assert.equal(replacement.workflowSteps.length, 4)

  const collisionSource = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-913",
    workflowStatus: WorkflowStatus.SubmittedToClient,
  })
  await prisma.documentRevision.create({
    data: {
      documentId: collisionSource.document.id,
      revisionLabel: "01",
      revisionIndex: 99,
      isCurrent: false,
    },
  })
  const repliesBeforeCollision = await prisma.clientReply.count()
  await assert.rejects(
    recordClientReply(baseline.actor, {
      documentId: collisionSource.document.id,
      reviewCodeId: baseline.revisionRequiredCode.id,
      nextAction: ClientReplyNextAction.REVISION_REQUIRED,
      transmittalId: undefined,
      driveTargetFolderType: undefined,
      replyDate: baseline.fixedDate,
      comments: "Collision",
      returnedFileName: undefined,
    }),
    /Unique constraint/
  )
  assert.equal(await prisma.clientReply.count(), repliesBeforeCollision)
})

test("transmittal database behavior uses fake delivery adapters and rolls back safely", async () => {
  const baseline = await createCharacterizationBaseline()
  const ready = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-920",
    workflowStatus: WorkflowStatus.ReadyToSubmit,
  })
  const created = await createTransmittal(baseline.actor, {
    projectId: baseline.project.id,
    revisionIds: [ready.revision.id],
    subject: "Characterization transmittal",
    purpose: "Approval",
    fromText: "Document Control",
    toText: "client@example.invalid",
    ccText: "archive@example.invalid",
    attention: "Client DC",
    messageBody: "Synthetic delivery",
    respondByDate: baseline.fixedDate,
  })
  assert.equal(created.status, TransmittalStatus.ReadyToSend)
  assert.match(created.transmittalNumber, /^TPR-TRM-\d{4}-001$/)
  assert.equal(created.toText, "client@example.invalid")
  assert.equal(await prisma.transmittalItem.count(), 1)

  await assert.rejects(
    createTransmittal(baseline.actor, {
      projectId: baseline.project.id,
      revisionIds: [ready.revision.id],
      subject: "Duplicate reservation",
    }),
    /already reserved/
  )

  const calls = { upload: 0, notify: 0 }
  const adapters: TransmittalDeliveryAdapters = {
    uploadBytes: async (input) => {
      calls.upload += 1
      return {
        storageProvider: StorageProvider.LOCAL_CONTROLLED_FILESYSTEM,
        providerKey: "synthetic-transmittal-file",
        fileName: input.fileName,
        fileSizeBytes: Buffer.from(input.bytes).length,
        mimeType: input.mimeType,
        checksum: "synthetic-transmittal-checksum",
      }
    },
    sendEmail: async () => ({ queued: false, sent: false }),
    notifyRoles: async (input) => {
      calls.notify += 1
      await prisma.notification.create({
        data: {
          userId: baseline.actor.id,
          projectId: input.projectId,
          clientId: input.clientId,
          channel: NotificationChannel.InApp,
          status: NotificationStatus.Sent,
          title: input.title,
          body: input.body,
        },
      })
      return { count: 1 }
    },
  }
  await deliverTransmittalNow(
    baseline.actor,
    { transmittalId: created.id },
    adapters
  )
  const sent = await prisma.transmittal.findUniqueOrThrow({
    where: { id: created.id },
    include: { generatedDocuments: true },
  })
  assert.equal(sent.status, TransmittalStatus.Sent)
  assert.equal(sent.generatedDocuments.length, 1)
  assert.deepEqual(calls, { upload: 1, notify: 1 })
  assert.equal(
    (
      await prisma.documentRevision.findUniqueOrThrow({
        where: { id: ready.revision.id },
      })
    ).workflowStatus,
    WorkflowStatus.SubmittedToClient
  )
  assert.equal(
    await prisma.auditLog.count({ where: { action: "transmittal.send" } }),
    1
  )
  assert.equal(await prisma.notification.count(), 1)

  const rollbackReady = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-921",
    workflowStatus: WorkflowStatus.ReadyToSubmit,
  })
  const rollbackTransmittal = await createTransmittal(baseline.actor, {
    projectId: baseline.project.id,
    revisionIds: [rollbackReady.revision.id],
    subject: "Failed synthetic upload",
  })
  await assert.rejects(
    deliverTransmittalNow(
      baseline.actor,
      { transmittalId: rollbackTransmittal.id },
      {
        ...adapters,
        uploadBytes: async () => {
          throw new Error("synthetic upload failure")
        },
      }
    ),
    /synthetic upload failure/
  )
  assert.equal(
    (
      await prisma.transmittal.findUniqueOrThrow({
        where: { id: rollbackTransmittal.id },
      })
    ).status,
    TransmittalStatus.ReadyToSend
  )
  assert.equal(
    await prisma.generatedDocument.count({
      where: { transmittalId: rollbackTransmittal.id },
    }),
    0
  )
})

test("database-backed read models return scoped business results and empty-state counts", async () => {
  const emptyActor = {
    id: "empty-user",
    fullName: "Empty User",
    timezone: "Asia/Riyadh",
    signatureProfile: null,
    userRoles: [
      {
        role: { code: "super_admin", name: "Super Admin" },
      },
    ],
    projectRoles: [],
  }
  const emptyDashboard = await getDashboardOverview()
  const emptySearch = await searchPlatform(emptyActor as never, "anything")
  const emptyReport = await getReportingOverview(emptyActor as never)
  assert.equal(emptyDashboard.mdrCount, 0)
  assert.equal(emptyDashboard.pendingReplyCount, 0)
  assert.equal(emptySearch.counts.mdrDocuments, 0)
  assert.equal(emptyReport.counts.projects, 0)

  const baseline = await createCharacterizationBaseline()
  const pdi = await createPdiItem(
    pdiInput(baseline, "Scoped characterization title")
  )
  const submitted = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-930",
    title: "Scoped characterization title",
    workflowStatus: WorkflowStatus.SubmittedToClient,
  })
  const transmittal = await prisma.transmittal.create({
    data: {
      projectId: baseline.project.id,
      transmittalNumber: "TPR-TRM-2026-930",
      subject: "Scoped characterization",
      status: TransmittalStatus.Sent,
      sentAt: baseline.fixedDate,
      items: {
        create: {
          documentRevisionId: submitted.revision.id,
          documentFileId: submitted.file.id,
          itemOrder: 1,
        },
      },
    },
  })
  await prisma.clientReply.create({
    data: {
      projectId: baseline.project.id,
      documentId: submitted.document.id,
      documentRevisionId: submitted.revision.id,
      transmittalId: transmittal.id,
      reviewCodeId: baseline.informationCode.id,
      replyState: ClientReplyState.InformationOnly,
      nextAction: ClientReplyNextAction.NO_FURTHER_ACTION,
      comments: "Scoped characterization",
      driveFileName: "scoped-characterization.pdf",
      replyDate: baseline.fixedDate,
    },
  })
  await prisma.notification.create({
    data: {
      userId: baseline.actor.id,
      projectId: baseline.project.id,
      channel: NotificationChannel.InApp,
      status: NotificationStatus.Sent,
      title: "Synthetic task",
      body: "Synthetic task body",
    },
  })
  await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-931",
    title: "Preparation queue",
  })

  const search = await searchPlatform(baseline.actor, "TPR")
  const titleSearch = await searchPlatform(
    baseline.actor,
    "Scoped characterization title"
  )
  const dashboard = await getDashboardOverview()
  const tasks = await getTaskDashboard(baseline.actor)
  const reports = await getReportingOverview(baseline.actor)

  assert.equal(search.counts.pdiItems, 1)
  assert.equal(search.counts.mdrDocuments, 2)
  assert.equal(search.counts.transmittals, 1)
  assert.equal(search.counts.clientReplies, 1)
  assert.equal(titleSearch.counts.mdrDocuments, 1)
  assert.equal(
    titleSearch.mdrDocuments[0].dtgsaDocumentNumber,
    "TPR-TST-DWG-930"
  )
  assert.equal(dashboard.mdrCount, 2)
  assert.equal(dashboard.submittedCount, 1)
  assert.equal(dashboard.pendingReplyCount, 2)
  assert.equal(tasks.counts.myActions, 1)
  assert.equal(tasks.counts.unreadNotifications, 1)
  assert.equal(reports.counts.projects, 2)
  assert.equal(reports.counts.currentRevisions, 2)
  assert.equal(reports.counts.transmittals, 1)
  assert.equal(reports.counts.replies, 1)
  assert.equal(pdi.projectId, baseline.project.id)

  const other = await createDocumentFixture(baseline, {
    documentNumber: "OTH-TST-DWG-999",
    projectId: baseline.otherProject.id,
  })
  const viewerRole = await prisma.role.create({
    data: {
      code: "project_viewer",
      name: "Synthetic project viewer",
    },
  })
  const viewer = await prisma.user.create({
    data: {
      email: "project.viewer@example.invalid",
      fullName: "Project Viewer",
      projectRoles: {
        create: {
          projectId: baseline.project.id,
          roleId: viewerRole.id,
        },
      },
    },
  })
  const scopedActor = await prisma.user.findUniqueOrThrow({
    where: { id: viewer.id },
    include: {
      signatureProfile: true,
      userRoles: { include: { role: true } },
      projectRoles: {
        include: {
          role: true,
          project: { select: { code: true, name: true } },
        },
      },
    },
  })
  const scopedSearch = await searchPlatform(scopedActor, "TST-DWG")
  assert.ok(
    scopedSearch.mdrDocuments.every(
      (document) => document.projectId === baseline.project.id
    )
  )
  assert.ok(
    scopedSearch.mdrDocuments.every(
      (document) => document.id !== other.document.id
    )
  )
})

test("Phase 3 database constraints protect controlled files, cycles, versions, audit, and idempotency", async () => {
  const baseline = await createCharacterizationBaseline()
  const fixture = await createDocumentFixture(baseline)
  const firstFile = await prisma.fileObject.create({
    data: {
      storageProvider: StorageProvider.LOCAL_TEMPORARY_ARTIFACT,
      providerKey: "phase3/main-1.pdf",
      fileName: "main-1.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100n,
      checksum: "a".repeat(64),
    },
  })
  await prisma.controlledMainFile.create({
    data: {
      revisionId: fixture.revision.id,
      fileObjectId: firstFile.id,
    },
  })
  const secondFile = await prisma.fileObject.create({
    data: {
      storageProvider: StorageProvider.LOCAL_TEMPORARY_ARTIFACT,
      providerKey: "phase3/main-2.pdf",
      fileName: "main-2.pdf",
      mimeType: "application/pdf",
      sizeBytes: 200n,
      checksum: "b".repeat(64),
    },
  })
  await assert.rejects(
    prisma.controlledMainFile.create({
      data: {
        revisionId: fixture.revision.id,
        fileObjectId: secondFile.id,
      },
    }),
    /Unique constraint/
  )

  const definition = await prisma.workflowDefinition.create({
    data: { code: "DEFAULT", name: "Default workflow" },
  })
  const version = await prisma.workflowDefinitionVersion.create({
    data: {
      definitionId: definition.id,
      version: 1,
      status: FoundationRecordStatus.Published,
      publishedAt: new Date(),
    },
  })
  const snapshot = await prisma.workflowSnapshot.create({
    data: {
      definitionVersionId: version.id,
      snapshotHash: "workflow-snapshot-1",
      content: { steps: [] },
    },
  })
  await assert.rejects(
    prisma.workflowDefinitionVersion.update({
      where: { id: version.id },
      data: { publishedAt: new Date() },
    }),
    /Published version records are immutable/
  )
  const draftVersion = await prisma.workflowDefinitionVersion.create({
    data: {
      definitionId: definition.id,
      version: 2,
    },
  })
  await prisma.workflowDefinitionVersion.delete({
    where: { id: draftVersion.id },
  })
  assert.equal(
    await prisma.workflowDefinitionVersion.findUnique({
      where: { id: draftVersion.id },
    }),
    null
  )

  await prisma.approvalCycle.create({
    data: {
      revisionId: fixture.revision.id,
      snapshotId: snapshot.id,
      cycleNumber: 1,
      contentHash: "content-1",
    },
  })
  await assert.rejects(
    prisma.approvalCycle.create({
      data: {
        revisionId: fixture.revision.id,
        snapshotId: snapshot.id,
        cycleNumber: 2,
        contentHash: "content-2",
      },
    }),
    /Unique constraint/
  )

  const audit = await prisma.auditLog.create({
    data: {
      action: "phase3.constraint.test",
      entityType: "DocumentRevision",
      entityId: fixture.revision.id,
      currentAuditHash: "audit-phase3-1",
    },
  })
  await assert.rejects(
    prisma.auditLog.update({
      where: { id: audit.id },
      data: { action: "phase3.constraint.changed" },
    }),
    /AuditLog is append-only/
  )

  await prisma.idempotencyRecord.create({
    data: {
      clientId: "integration-client",
      scope: "approval",
      key: "request-1",
      requestHash: "hash-1",
      expiresAt: new Date(Date.now() + 60_000),
    },
  })
  await assert.rejects(
    prisma.idempotencyRecord.create({
      data: {
        clientId: "integration-client",
        scope: "approval",
        key: "request-1",
        requestHash: "hash-2",
        expiresAt: new Date(Date.now() + 60_000),
      },
    }),
    /Unique constraint/
  )

  await prisma.verificationCode.create({
    data: {
      manifestId: "manifest-1",
      codeHash: "verification-code-hash",
    },
  })
  await assert.rejects(
    prisma.verificationCode.create({
      data: {
        manifestId: "manifest-2",
        codeHash: "verification-code-hash",
      },
    }),
    /Unique constraint/
  )

  const manifest = await prisma.packageManifest.create({
    data: {
      revisionId: fixture.revision.id,
      schemaVersion: "1",
      canonicalizationVersion: "1",
      manifestJson: { documentNumber: fixture.document.documentNumber },
    },
  })
  await assert.rejects(
    prisma.packageManifest.create({
      data: {
        revisionId: fixture.revision.id,
        schemaVersion: "1",
        canonicalizationVersion: "1",
        manifestJson: { duplicate: true },
      },
    }),
    /Unique constraint/
  )
  await prisma.packageHash.create({
    data: {
      manifestId: manifest.id,
      algorithm: "SHA-256",
      value: "c".repeat(64),
    },
  })

  const codeSet = await prisma.clientResponseCodeSet.create({
    data: {
      clientId: baseline.client.id,
      code: "PHASE3",
      name: "Phase 3 response policy",
    },
  })
  const codeSetVersion = await prisma.clientResponseCodeSetVersion.create({
    data: {
      codeSetId: codeSet.id,
      version: 1,
    },
  })
  const responseCode = await prisma.clientResponseCode.create({
    data: {
      versionId: codeSetVersion.id,
      externalCode: "A",
      exactWording: "Approved",
      internalLabel: "Approved",
      outcomeClass: "approved",
      countsAsApproved: true,
    },
  })
  const policySnapshot = await prisma.clientResponsePolicySnapshot.create({
    data: {
      projectId: baseline.project.id,
      codeSetVersionId: codeSetVersion.id,
      snapshotHash: "client-response-policy-snapshot-1",
      content: {
        codes: [{ id: responseCode.id, externalCode: "A" }],
      },
    },
  })
  await prisma.clientResponseCodeSetVersion.update({
    where: { id: codeSetVersion.id },
    data: {
      status: FoundationRecordStatus.Published,
      publishedAt: new Date(),
    },
  })
  await assert.rejects(
    prisma.clientResponseCode.update({
      where: { id: responseCode.id },
      data: { exactWording: "Changed after publication" },
    }),
    /Published response-code content is immutable/
  )
  const persistedSnapshot =
    await prisma.clientResponsePolicySnapshot.findUnique({
      where: { id: policySnapshot.id },
    })
  assert.deepEqual(persistedSnapshot?.content, {
    codes: [{ id: responseCode.id, externalCode: "A" }],
  })
})

test("Phase 4 identity persistence enforces immutable subjects, isolated invitations, versioned roles, and suspension", async () => {
  const baseline = await createCharacterizationBaseline()
  const googleIdentity = await prisma.userIdentity.create({
    data: {
      userId: baseline.actor.id,
      provider: "google_workspace",
      subject: "immutable-subject-1",
      emailAtLink: baseline.actor.email,
    },
  })
  const workspaceIdentity = await prisma.googleWorkspaceIdentity.create({
    data: {
      userIdentityId: googleIdentity.id,
      googleSubject: "immutable-subject-1",
      hostedDomain: "dtg.example",
    },
  })
  await assert.rejects(
    prisma.googleWorkspaceIdentity.update({
      where: { id: workspaceIdentity.id },
      data: { googleSubject: "mutated-subject" },
    }),
    /Google subject mappings are immutable/
  )

  const sessionTokenHash = hashOpaqueToken("phase4-internal-session")
  const session = await prisma.internalAuthSession.create({
    data: {
      userId: baseline.actor.id,
      tokenHash: sessionTokenHash,
      csrfTokenHash: hashOpaqueToken("phase4-internal-csrf"),
      authMode: "GOOGLE_WORKSPACE",
      authenticatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    },
  })
  await assert.rejects(
    prisma.internalAuthSession.create({
      data: {
        userId: baseline.actor.id,
        tokenHash: hashOpaqueToken("invalid-expiry-session"),
        csrfTokenHash: hashOpaqueToken("invalid-expiry-csrf"),
        authMode: "GOOGLE_WORKSPACE",
        authenticatedAt: new Date(),
        expiresAt: new Date(0),
      },
    }),
    /InternalAuthSession_valid_expiry/
  )

  const mapping = await upsertGoogleGroupMapping(baseline.actor.id, {
    groupId: "workspace-reviewers",
    roleCode: baseline.actor.userRoles[0]!.role.code,
    projectId: baseline.project.id,
    isActive: true,
  })
  await upsertGoogleGroupMapping(baseline.actor.id, {
    groupId: "workspace-reviewers",
    roleCode: baseline.actor.userRoles[0]!.role.code,
    projectId: baseline.project.id,
    isActive: false,
  })
  const versions = await prisma.googleGroupMappingVersion.findMany({
    where: { mappingId: mapping.mapping.id },
    orderBy: { version: "asc" },
  })
  assert.deepEqual(
    versions.map((version) => version.version),
    [1, 2]
  )
  await assert.rejects(
    prisma.googleGroupMappingVersion.update({
      where: { id: versions[0]!.id },
      data: { snapshot: { changed: true } },
    }),
    /append-only/
  )

  const externalContact = await prisma.user.create({
    data: {
      email: "client.contact@example.invalid",
      fullName: "Client Contact",
    },
  })
  const delivery = new FakePortalInvitationDeliveryAdapter()
  const invitation = await createExternalPortalInvitation(
    baseline.actor.id,
    {
      email: externalContact.email,
      fullName: externalContact.fullName,
      clientId: baseline.client.id,
      projectId: baseline.project.id,
      usePolicy: "OneTime",
      expiresInMinutes: 10,
    },
    delivery
  )
  assert.equal(delivery.deliveries.length, 1)
  const rawMagicToken = new URL(
    delivery.deliveries[0]!.magicLink
  ).searchParams.get("token")
  assert.ok(rawMagicToken)
  assert.equal(invitation.tokenHash, hashOpaqueToken(rawMagicToken!))
  assert.equal(
    await prisma.externalPortalInvitation.count({
      where: { tokenHash: rawMagicToken! },
    }),
    0
  )

  const redeemed = await redeemExternalPortalInvitation({
    rawToken: rawMagicToken!,
    rateLimitKey: "phase4-redeem",
  })
  const portalSession = await prisma.externalPortalSession.findUniqueOrThrow({
    where: { id: redeemed.session.id },
    include: {
      invitation: { include: { pdiItems: true } },
      identity: {
        include: {
          identity: { include: { user: true } },
        },
      },
    },
  })
  assert.doesNotThrow(() =>
    assertExternalPortalScope(portalSession, {
      clientId: baseline.client.id,
      projectId: baseline.project.id,
    })
  )
  assert.throws(
    () =>
      assertExternalPortalScope(portalSession, {
        clientId: "another-client",
        projectId: baseline.project.id,
      }),
    /Cross-client portal access is denied/
  )
  assert.throws(
    () =>
      assertExternalPortalScope(portalSession, {
        clientId: baseline.client.id,
        projectId: baseline.otherProject.id,
      }),
    /Cross-project portal access is denied/
  )
  await assert.rejects(
    redeemExternalPortalInvitation({
      rawToken: rawMagicToken!,
      rateLimitKey: "phase4-replay",
    }),
    /already been used/
  )
  await revokeExternalInvitation(baseline.actor.id, invitation.id)
  assert.equal(
    (
      await prisma.externalPortalSession.findUniqueOrThrow({
        where: { id: portalSession.id },
      })
    ).revokedAt !== null,
    true
  )

  const activeMapping = await upsertGoogleGroupMapping(baseline.actor.id, {
    groupId: "workspace-approvers",
    roleCode: baseline.actor.userRoles[0]!.role.code,
    isActive: true,
  })
  const directory = new FakeWorkspaceDirectoryAdapter([
    {
      users: [
        {
          subject: "directory-subject-1",
          primaryEmail: "directory.user@dtg.example",
          fullName: "Directory User",
          employeeId: "EMP-004",
          department: "Engineering",
          jobTitle: "Engineer",
          suspended: false,
          groups: [activeMapping.mapping.groupId],
        },
      ],
    },
  ])
  const syncRun = await synchronizeWorkspaceDirectory(directory)
  assert.equal(syncRun.status, "Completed")
  assert.equal(syncRun.usersSeen, 1)
  assert.equal(syncRun.groupsSeen, 1)
  const directoryUser = await prisma.user.findUniqueOrThrow({
    where: { email: "directory.user@dtg.example" },
  })
  assert.equal(directoryUser.isActive, true)
  assert.equal(
    await prisma.directoryRoleAssignment.count({
      where: { userId: directoryUser.id, inactiveAt: null },
    }),
    1
  )

  const directorySession = await prisma.internalAuthSession.create({
    data: {
      userId: directoryUser.id,
      tokenHash: hashOpaqueToken("directory-session"),
      csrfTokenHash: hashOpaqueToken("directory-csrf"),
      authMode: "GOOGLE_WORKSPACE",
      authenticatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    },
  })
  const assignment = await prisma.workflowAssignment.create({
    data: {
      stepInstanceId: "phase4-step",
      assigneeType: "User",
      assigneeId: directoryUser.id,
      snapshot: { userId: directoryUser.id },
    },
  })
  await synchronizeWorkspaceDirectory(
    new FakeWorkspaceDirectoryAdapter([
      {
        users: [
          {
            subject: "directory-subject-1",
            primaryEmail: "directory.user@dtg.example",
            fullName: "Directory User",
            suspended: true,
            groups: [],
          },
        ],
      },
    ])
  )
  assert.equal(
    (
      await prisma.user.findUniqueOrThrow({
        where: { id: directoryUser.id },
      })
    ).isActive,
    false
  )
  assert.ok(
    (
      await prisma.internalAuthSession.findUniqueOrThrow({
        where: { id: directorySession.id },
      })
    ).revokedAt
  )
  assert.ok(
    (
      await prisma.workflowAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      })
    ).reassignmentRequiredAt
  )
  assert.equal(
    await prisma.auditLog.count({
      where: {
        action: {
          in: [
            "identity.external.invitation.created",
            "identity.external.login",
            "identity.directory.user_suspended",
          ],
        },
      },
    }),
    3
  )
  assert.equal(session.revokedAt, null)
})

test("Phase 5 controlled Drive copy is idempotent, authoritative, scoped, streamed, and tamper-evident", async () => {
  const baseline = await createCharacterizationBaseline()
  const fixture = await createDocumentFixture(baseline)
  const pdf = await PDFDocument.create()
  pdf.addPage([300, 200])
  const bytes = Buffer.from(await pdf.save())
  const drive = new FakeDriveStorageAdapter()
  drive.seed(
    {
      fileId: "working-file-1",
      driveId: "drive-1",
      name: "Working File.pdf",
      mimeType: "application/pdf",
      sizeBytes: bytes.length,
      parents: ["working-folder"],
      owners: ["dc@dtg.example"],
      trashed: false,
    },
    bytes
  )

  const handoff = await beginPickerSelection(
    baseline.actor,
    baseline.project.id
  )
  const reserved = await reserveControlledMainFile({
    actor: baseline.actor,
    revisionId: fixture.revision.id,
    rawNonce: handoff.nonce,
    selectedFileId: "working-file-1",
    adapter: drive,
  })
  const verified = await processControlledCopyJob(reserved.jobId, drive)
  assert.equal(verified.integrityStatus, "Verified")
  const repeated = await processControlledCopyJob(reserved.jobId, drive)
  assert.equal(repeated.id, verified.id)

  const stored = await prisma.controlledMainFile.findUniqueOrThrow({
    where: { id: verified.id },
    include: {
      fileObject: { include: { driveIdentity: true } },
    },
  })
  assert.equal(
    stored.fileObject.storageProvider,
    StorageProvider.LOCAL_CONTROLLED_FILESYSTEM
  )
  assert.equal(stored.fileObject.pageCount, 1)
  assert.equal(stored.fileObject.checksum.length, 64)
  assert.ok(stored.fileObject.driveIdentity?.driveFileId)
  assert.notEqual(
    stored.fileObject.driveIdentity?.driveFileId,
    stored.sourceFileId
  )
  assert.match(stored.opaqueFileName!, /^[a-f0-9]{48}\.pdf$/)

  const opened = await openControlledFile({
    actor: baseline.actor,
    fileObjectId: stored.fileObjectId,
    rangeHeader: "bytes=0-9",
    adapter: drive,
  })
  assert.equal(opened.status, 206)
  assert.equal(opened.headers["Cache-Control"], "private, no-store, max-age=0")
  assert.equal(
    JSON.stringify(opened).includes(
      stored.fileObject.driveIdentity!.driveFileId
    ),
    false
  )
  const delivered: Buffer[] = []
  for await (const chunk of opened.stream) delivered.push(Buffer.from(chunk))
  assert.equal(Buffer.concat(delivered).length, 10)

  const secondHandoff = await beginPickerSelection(
    baseline.actor,
    baseline.project.id
  )
  await assert.rejects(
    reserveControlledMainFile({
      actor: baseline.actor,
      revisionId: fixture.revision.id,
      rawNonce: secondHandoff.nonce,
      selectedFileId: "working-file-1",
      adapter: drive,
    }),
    /Unique constraint|one_active_per_revision/
  )

  const controlledDriveId = stored.fileObject.driveIdentity!.driveFileId
  drive.files.get(controlledDriveId)!.permissions.push({
    id: "public-access",
    type: "anyone",
    role: "reader",
  })
  const reconciliation = await reconcileControlledDrive(drive, {
    fileObjectIds: [stored.fileObjectId],
  })
  assert.equal(reconciliation.checkedCount, 1)
  assert.equal(reconciliation.mismatchCount, 1)
  assert.equal(
    (
      await prisma.controlledMainFile.findUniqueOrThrow({
        where: { id: stored.id },
      })
    ).integrityStatus,
    "PermissionDrift"
  )
  assert.equal(
    await prisma.controlledStorageIssue.count({
      where: {
        fileObjectId: stored.fileObjectId,
        issueType: "PERMISSION_DRIFT",
      },
    }),
    1
  )
  await assert.rejects(
    openControlledFile({
      actor: baseline.actor,
      fileObjectId: stored.fileObjectId,
      rangeHeader: null,
      adapter: drive,
    }),
    /integrity-blocked/
  )
})

test("Phase 7 workflow decisions are package-bound, evidence-backed, and concurrency-safe", async () => {
  const baseline = await createCharacterizationBaseline()
  const fixture = await createDocumentFixture(baseline)
  const users = await Promise.all(
    ["reviewer", "approver", "dc", "delegate"].map((name) =>
      prisma.user.create({
        data: {
          email: `${name}@phase7.example`,
          fullName: `Phase 7 ${name}`,
        },
      })
    )
  )
  const fileHash = "a".repeat(64)
  const fileObject = await prisma.fileObject.create({
    data: {
      storageProvider: StorageProvider.GOOGLE_DRIVE_CONTROLLED,
      providerKey: "phase7-main-file",
      fileName: "phase7.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      checksum: fileHash,
      pageCount: 1,
    },
  })
  await prisma.controlledMainFile.create({
    data: {
      revisionId: fixture.revision.id,
      fileObjectId: fileObject.id,
      integrityStatus: "Verified",
      verifiedAt: new Date(),
      opaqueFileName: "phase7.pdf",
    },
  })
  const manifest = await prisma.packageManifest.create({
    data: {
      revisionId: fixture.revision.id,
      schemaVersion: "phase7-1",
      canonicalizationVersion: "1",
      manifestJson: { document: fixture.document.id },
    },
  })
  const packageHash = "b".repeat(64)
  await prisma.packageHash.create({
    data: {
      manifestId: manifest.id,
      algorithm: "SHA-256",
      value: packageHash,
    },
  })
  const draft = await createWorkflowDraft({
    definitionCode: "ENGINEERING_DEFAULT",
    definitionName: "Engineering default",
    policy: DEFAULT_ENGINEERING_WORKFLOW,
  })
  await publishWorkflowVersion(draft.id)
  const assignments = [
    { stepKey: "prepared", userIds: [baseline.actor.id] },
    { stepKey: "reviewed", userIds: [users[0]!.id] },
    { stepKey: "approved", userIds: [users[1]!.id] },
    { stepKey: "dc-validated", userIds: [users[2]!.id] },
  ]
  await assert.rejects(
    startApprovalCycle({
      revisionId: fixture.revision.id,
      definitionVersionId: draft.id,
      packageHash,
      assignments: DEFAULT_ENGINEERING_WORKFLOW.steps.map((step) => ({
        stepKey: step.key,
        userIds: [baseline.actor.id],
      })),
    }),
    /Separation of duties/
  )
  const cycle = await startApprovalCycle({
    revisionId: fixture.revision.id,
    definitionVersionId: draft.id,
    packageHash,
    assignments,
  })
  const prepared = await prisma.workflowStepInstance.findFirstOrThrow({
    where: { approvalCycleId: cycle.id, stepKey: "prepared" },
  })
  assert.equal(prepared.status, "Active")
  const review = await prisma.reviewSession.create({
    data: {
      stepInstanceId: prepared.id,
      userId: baseline.actor.id,
      contentHash: packageHash,
      packageHash,
      completedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      declarationAcceptedAt: new Date(),
    },
  })
  const recentAuth = await prisma.recentAuthenticationEvidence.create({
    data: {
      userId: baseline.actor.id,
      provider: "google",
      method: "oidc",
      authenticatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    },
  })
  const evidence = {
    googleSubjectId: "phase7-google-subject",
    employeeId: baseline.actor.id,
    employeeName: baseline.actor.fullName,
    roleSnapshot: { role: "discipline_user" },
    departmentOrProjectRole: "Prepared By Manager",
    documentNumber: fixture.document.dtgsaDocumentNumber,
    revision: fixture.revision.revisionLabel,
    mainFileSha256: fileHash,
    workflowSnapshotDigest: "c".repeat(64),
    declarationVersion: "1",
    declarationTextHash: "d".repeat(64),
    commentReferences: [],
    recentAuthEvidenceId: recentAuth.id,
    sessionHash: "e".repeat(64),
    ipHash: "f".repeat(64),
    userAgentHash: "1".repeat(64),
    signatureAppearanceVersionId: "appearance-v1",
  }
  const command = {
    stepInstanceId: prepared.id,
    actorUserId: baseline.actor.id,
    decision: "APPROVE",
    expectedStateVersion: 0,
    idempotencyKey: "phase7-prepare-decision",
    reviewSessionId: review.id,
    evidence,
  }
  const [first, duplicate] = await Promise.all([
    recordWorkflowDecision(command),
    recordWorkflowDecision(command),
  ])
  assert.equal(first.id, duplicate.id)
  assert.equal(
    await prisma.approvalDecision.count({
      where: { stepInstanceId: prepared.id },
    }),
    1
  )
  assert.equal(
    await prisma.approvalEvidence.count({
      where: { approvalDecisionId: first.id },
    }),
    1
  )
  await assert.rejects(
    recordWorkflowDecision({
      ...command,
      idempotencyKey: "phase7-conflicting-decision",
    }),
    /not active|state conflict/
  )
  assert.equal(
    (
      await prisma.workflowStepInstance.findFirstOrThrow({
        where: { approvalCycleId: cycle.id, stepKey: "reviewed" },
      })
    ).status,
    "Active"
  )
  const reviewedStep = await prisma.workflowStepInstance.findFirstOrThrow({
    where: { approvalCycleId: cycle.id, stepKey: "reviewed" },
  })
  const delegation = await prisma.delegation.create({
    data: {
      delegatorUserId: users[0]!.id,
      delegateUserId: users[3]!.id,
      scope: `workflow-step:${reviewedStep.id}`,
      startsAt: new Date(Date.now() - 1_000),
      endsAt: new Date(Date.now() + 60_000),
    },
  })
  await reassignWorkflowStep({
    stepInstanceId: reviewedStep.id,
    fromUserId: users[0]!.id,
    toUserId: users[3]!.id,
    changedByUserId: baseline.actor.id,
    reason: "Reviewer acting delegation",
    delegationId: delegation.id,
  })
  await assert.rejects(
    reassignWorkflowStep({
      stepInstanceId: reviewedStep.id,
      fromUserId: users[3]!.id,
      toUserId: users[1]!.id,
      changedByUserId: baseline.actor.id,
      reason: "Would conflict with approver",
    }),
    /separation of duties/
  )
  const override = await requestSeparationOverride({
    requesterUserId: baseline.actor.id,
    scope: `workflow-step:${reviewedStep.id}`,
    reason: "Emergency coverage",
    expiresAt: new Date(Date.now() + 60_000),
  })
  await assert.rejects(
    approveSeparationOverride({
      requestId: override.id,
      approverUserId: baseline.actor.id,
    }),
    /self-approved/
  )
  await approveSeparationOverride({
    requestId: override.id,
    approverUserId: users[2]!.id,
  })
  await reassignWorkflowStep({
    stepInstanceId: reviewedStep.id,
    fromUserId: users[3]!.id,
    toUserId: users[1]!.id,
    changedByUserId: baseline.actor.id,
    reason: "Approved emergency coverage",
    approvedOverrideRequestId: override.id,
  })
  assert.equal(
    await prisma.outboxEvent.count({
      where: {
        aggregateId: reviewedStep.id,
        eventType: "ASSIGNMENT_CHANGED",
      },
    }),
    2
  )
  await assert.rejects(
    prisma.workflowSnapshot.update({
      where: { id: cycle.snapshotId },
      data: { content: { tampered: true } },
    }),
    /immutable/
  )
  await invalidateCycleForContentChange({
    revisionId: fixture.revision.id,
    newPackageHash: "9".repeat(64),
    submittedToClient: false,
    currentExternalRevision: fixture.revision.revisionLabel,
  })
  assert.equal(
    (await prisma.approvalCycle.findUniqueOrThrow({ where: { id: cycle.id } }))
      .status,
    "Invalidated"
  )
  assert.equal(
    await prisma.approvalDecision.count({ where: { id: first.id } }),
    1
  )
})

test("Phase 8 visual covers publish immutably, inherit by scope, and preserve history", async () => {
  const baseline = await createCharacterizationBaseline()
  const unauthorizedActor = {
    ...baseline.actor,
    userRoles: [],
    projectRoles: [],
  }
  await assert.rejects(
    createVisualCoverDraft({
      actor: unauthorizedActor,
      code: "UNAUTHORIZED",
      name: "Unauthorized",
      scopeType: "ORGANIZATION",
    }),
    /not authorized/
  )
  await assert.rejects(
    createVisualCoverDraft({
      actor: baseline.actor,
      code: "INVALID_SCOPE",
      name: "Invalid scope",
      scopeType: "CLIENT",
      scopeId: baseline.discipline.id,
    }),
    /does not exist or is inactive/
  )

  const organization = await createVisualCoverDraft({
    actor: baseline.actor,
    code: "ORG_COVER",
    name: "Organization cover",
    scopeType: "ORGANIZATION",
  })
  await publishVisualCoverVersion({
    actor: baseline.actor,
    versionId: organization.id,
  })
  const client = await createVisualCoverDraft({
    actor: baseline.actor,
    code: "CLIENT_COVER_VISUAL",
    name: "Client cover",
    scopeType: "CLIENT",
    scopeId: baseline.client.id,
    cloneVersionId: organization.id,
  })
  await publishVisualCoverVersion({
    actor: baseline.actor,
    versionId: client.id,
  })
  const project = await createVisualCoverDraft({
    actor: baseline.actor,
    code: "PROJECT_COVER_VISUAL",
    name: "Project cover",
    scopeType: "PROJECT",
    scopeId: baseline.project.id,
    cloneVersionId: client.id,
  })
  const projectDocument: CoverTemplateDocument = {
    ...structuredClone(DEFAULT_COVER_TEMPLATE),
    elements: [
      ...structuredClone(DEFAULT_COVER_TEMPLATE.elements),
      {
        id: "project-response-legend",
        type: "CLIENT_RESPONSE_LEGEND",
        x: 0.08,
        y: 0.46,
        width: 0.84,
        height: 0.16,
        zIndex: 8,
      },
      {
        id: "additional-manager",
        type: "SIGNATURE_BOX",
        workflowStepKey: "manager-2",
        roleLabel: "Additional Manager",
        x: 0.52,
        y: 0.68,
        width: 0.4,
        height: 0.16,
        zIndex: 9,
      },
    ],
  }
  await saveVisualCoverDraft({
    actor: baseline.actor,
    versionId: project.id,
    template: projectDocument,
  })
  const publishedProject = await publishVisualCoverVersion({
    actor: baseline.actor,
    versionId: project.id,
  })
  const resolved = await resolvePublishedVisualCover({
    clientId: baseline.client.id,
    projectId: baseline.project.id,
    documentTypeId: baseline.documentType.id,
    disciplineId: baseline.discipline.id,
  })
  assert.equal(resolved?.id, publishedProject.id)
  await assert.rejects(
    prisma.coverLayoutElement.updateMany({
      where: { versionId: publishedProject.id },
      data: { x: 0.2 },
    }),
    /immutable/
  )

  const historicalSnapshot = publishedProject.snapshot
  const nextProject = await createVisualCoverDraft({
    actor: baseline.actor,
    code: "PROJECT_COVER_VISUAL",
    name: "Project cover",
    scopeType: "PROJECT",
    scopeId: baseline.project.id,
    cloneVersionId: publishedProject.id,
  })
  const modified = structuredClone(projectDocument)
  modified.elements[0]!.text = "New project layout"
  await saveVisualCoverDraft({
    actor: baseline.actor,
    versionId: nextProject.id,
    template: modified,
  })
  await publishVisualCoverVersion({
    actor: baseline.actor,
    versionId: nextProject.id,
  })
  const prior = await prisma.coverTemplateVersion.findUniqueOrThrow({
    where: { id: publishedProject.id },
  })
  assert.equal(prior.status, "Superseded")
  assert.deepEqual(prior.snapshot, historicalSnapshot)
  await archiveVisualCoverVersion({
    actor: baseline.actor,
    versionId: prior.id,
  })
  assert.equal(
    (
      await prisma.coverTemplateVersion.findUniqueOrThrow({
        where: { id: prior.id },
      })
    ).status,
    "Archived"
  )

  const codeSet = await prisma.clientResponseCodeSet.create({
    data: {
      clientId: baseline.client.id,
      code: "PROJECT8",
      name: "Project-specific legend",
    },
  })
  const codeVersion = await prisma.clientResponseCodeSetVersion.create({
    data: {
      codeSetId: codeSet.id,
      version: 1,
      status: FoundationRecordStatus.Draft,
      codes: {
        create: [
          {
            externalCode: "A",
            exactWording: "Accepted without comments",
            internalLabel: "Accepted",
            outcomeClass: "Approved",
            displayOrder: 1,
          },
          {
            externalCode: "R2",
            exactWording: "Revise selected items",
            internalLabel: "Revise",
            outcomeClass: "Revision",
            displayOrder: 2,
          },
        ],
      },
    },
  })
  await prisma.clientResponseCodeSetVersion.update({
    where: { id: codeVersion.id },
    data: {
      status: FoundationRecordStatus.Published,
      publishedAt: new Date(),
    },
  })
  await prisma.projectResponseCodeConfiguration.create({
    data: {
      projectId: baseline.project.id,
      codeSetVersionId: codeVersion.id,
    },
  })
  assert.deepEqual(await getProjectResponseLegend(baseline.project.id), [
    {
      externalCode: "A",
      exactWording: "Accepted without comments",
    },
    {
      externalCode: "R2",
      exactWording: "Revise selected items",
    },
  ])
  assert.ok(
    await prisma.auditLog.count({
      where: {
        action: { in: ["cover.visual.draft_saved", "cover.visual.published"] },
      },
    })
  )
})

test("Phase 9 review events are append-only and comment timelines preserve closure evidence", async () => {
  const baseline = await createCharacterizationBaseline()
  const fixture = await createDocumentFixture(baseline)
  const review = await prisma.reviewSession.create({
    data: {
      stepInstanceId: "phase-9-step",
      userId: baseline.actor.id,
      contentHash: "8".repeat(64),
      packageHash: "8".repeat(64),
      firstOpenedAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    },
  })
  const event = await prisma.reviewPageEvent.create({
    data: {
      reviewSessionId: review.id,
      pageNumber: 1,
      eventType: "PAGE_RENDERED",
      activeSeconds: 3,
    },
  })
  await assert.rejects(
    prisma.reviewPageEvent.update({
      where: { id: event.id },
      data: { activeSeconds: 300 },
    }),
    /append-only/
  )
  const comment = await prisma.comment.create({
    data: {
      revisionId: fixture.revision.id,
      authorUserId: baseline.actor.id,
      body: "Correct the marked dimension.",
      category: "Technical",
      blocking: true,
      responsibleDepartmentId: "engineering",
      state: CommentState.Open,
    },
  })
  await prisma.commentStatusEvent.createMany({
    data: [
      {
        commentId: comment.id,
        fromState: CommentState.Open,
        toState: CommentState.Resolved,
        actorUserId: baseline.actor.id,
      },
      {
        commentId: comment.id,
        fromState: CommentState.Resolved,
        toState: CommentState.Verified,
        actorUserId: "independent-verifier",
      },
    ],
  })
  assert.equal(
    await prisma.commentStatusEvent.count({ where: { commentId: comment.id } }),
    2
  )
})

test("Phase 10 transmittal requests are durable, idempotent, and not marked sent early", async () => {
  const baseline = await createCharacterizationBaseline()
  const ready = await createDocumentFixture(baseline, {
    documentNumber: "TPR-TST-DWG-1001",
    workflowStatus: WorkflowStatus.ReadyToSubmit,
  })
  const transmittal = await createTransmittal(baseline.actor, {
    projectId: baseline.project.id,
    revisionIds: [ready.revision.id],
    subject: "Durable transmittal delivery",
  })
  const first = await sendTransmittal(baseline.actor, {
    transmittalId: transmittal.id,
  })
  const duplicate = await sendTransmittal(baseline.actor, {
    transmittalId: transmittal.id,
  })
  assert.equal(first.id, duplicate.id)
  assert.equal(first.jobType, "TRANSMITTAL_DELIVER")
  assert.equal(
    (
      await prisma.transmittal.findUniqueOrThrow({
        where: { id: transmittal.id },
      })
    ).status,
    TransmittalStatus.ReadyToSend
  )
  assert.equal(
    await prisma.backgroundJob.count({
      where: { idempotencyKey: `transmittal:${transmittal.id}:deliver:v1` },
    }),
    1
  )
  assert.equal(
    await prisma.outboxEvent.count({
      where: {
        eventType: "transmittal.delivery_requested",
        aggregateId: transmittal.id,
      },
    }),
    1
  )
  assert.equal(
    await prisma.generatedDocument.count({
      where: { transmittalId: transmittal.id },
    }),
    0
  )
})

test("Phase 10 PostgreSQL leases recover and delivery attempts reject duplicates", async () => {
  const store = createPrismaJobStore(prisma)
  const queued = await store.enqueue({
    jobType: "EMAIL_SEND",
    payload: { messageId: "phase-10" },
    idempotencyKey: "phase-10:email:one",
    correlationId: "phase-10-correlation",
    maxAttempts: 3,
  })
  // `nextAttemptAt` defaults to the database clock, so the lease baseline is
  // anchored to the row that was just enqueued. A hardcoded calendar date made
  // this test pass only until the wall clock moved past it, at which point the
  // job was no longer due and every lease returned null.
  const now = new Date(
    (
      await prisma.backgroundJob.findUniqueOrThrow({
        where: { id: queued.id },
        select: { nextAttemptAt: true },
      })
    ).nextAttemptAt
  )
  const firstLease = await store.lease({
    owner: "worker-a",
    now,
    leaseMs: 1_000,
  })
  assert.equal(firstLease?.id, queued.id)
  assert.equal(
    await store.lease({ owner: "worker-b", now, leaseMs: 1_000 }),
    null
  )
  const recovered = await store.lease({
    owner: "worker-b",
    now: new Date(now.getTime() + 1_001),
    leaseMs: 1_000,
  })
  assert.equal(recovered?.id, queued.id)
  assert.equal(recovered?.attemptCount, 2)
  await store.complete({
    jobId: queued.id,
    owner: "worker-b",
    now: new Date(now.getTime() + 1_100),
    metrics: { durationMs: 99 },
  })
  assert.equal(
    (
      await prisma.backgroundJob.findUniqueOrThrow({
        where: { id: queued.id },
      })
    ).state,
    "Completed"
  )
  await prisma.deliveryAttempt.create({
    data: {
      channel: "EMAIL",
      targetHash: "recipient-hash",
      idempotencyKey: "phase-10:delivery:one",
    },
  })
  await assert.rejects(
    prisma.deliveryAttempt.create({
      data: {
        channel: "EMAIL",
        targetHash: "recipient-hash",
        idempotencyKey: "phase-10:delivery:one",
      },
    }),
    /Unique constraint/
  )
})

test("Phase 11 resolves project policies and preserves response evidence", async () => {
  const baseline = await createCharacterizationBaseline()
  const fixture = await createDocumentFixture(baseline, {
    workflowStatus: WorkflowStatus.SubmittedToClient,
  })
  const submittedMain = await prisma.fileObject.create({
    data: {
      storageProvider: StorageProvider.LOCAL_TEMPORARY_ARTIFACT,
      providerKey: "phase-11/submitted-main.pdf",
      fileName: "submitted-main.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100n,
      checksum: "1".repeat(64),
    },
  })
  const manifest = await prisma.packageManifest.create({
    data: {
      revisionId: fixture.revision.id,
      schemaVersion: "phase-11",
      canonicalizationVersion: "1",
      manifestJson: { mainFileObjectId: submittedMain.id },
      manifestDigest: "2".repeat(64),
    },
  })
  const submission = await prisma.clientSubmission.create({
    data: {
      revisionId: fixture.revision.id,
      manifestId: manifest.id,
      submittedMainFileObjectId: submittedMain.id,
      packageHash: "2".repeat(64),
      submissionNumber: 1,
    },
  })

  const clientSet = await prisma.clientResponseCodeSet.create({
    data: {
      clientId: baseline.client.id,
      code: "CLIENT_DEFAULT_11",
      name: "Client default response policy",
    },
  })
  const clientVersion = await prisma.clientResponseCodeSetVersion.create({
    data: {
      codeSetId: clientSet.id,
      version: 1,
      codes: {
        create: {
          externalCode: "A",
          exactWording: "Accepted for information",
          internalLabel: "Information only",
          outcomeClass: "INFORMATION_ONLY",
          countsAsApproved: true,
          displayOrder: 1,
        },
      },
    },
    include: { codes: true },
  })
  await prisma.clientResponseCodeSetVersion.update({
    where: { id: clientVersion.id },
    data: {
      status: FoundationRecordStatus.Published,
      publishedAt: new Date(),
      snapshotHash: "3".repeat(64),
    },
  })
  assert.equal(
    (
      await resolvePublishedResponsePolicy({
        projectId: baseline.otherProject.id,
        clientId: baseline.client.id,
      })
    )?.id,
    clientVersion.id
  )

  const projectSet = await prisma.clientResponseCodeSet.create({
    data: {
      clientId: baseline.client.id,
      code: "PROJECT_OVERRIDE_11",
      name: "Project response policy",
    },
  })
  const projectVersion = await prisma.clientResponseCodeSetVersion.create({
    data: {
      codeSetId: projectSet.id,
      version: 1,
      codes: {
        create: {
          externalCode: "2",
          exactWording: "Conditionally approved - rectify and resubmit",
          internalLabel: "Conditional approval",
          outcomeClass: "CONDITIONALLY_APPROVED",
          countsAsApproved: true,
          requiresCommentRectification: true,
          requiresNewRevision: true,
          requiresInternalReapproval: true,
          requiresResubmission: true,
          allowsTemporaryUse: true,
          requiresReturnedFile: true,
          expectedPrimaryFileKind: "COMMENT_SHEET",
          displayOrder: 1,
        },
      },
    },
    include: { codes: true },
  })
  await prisma.clientResponseCodeSetVersion.update({
    where: { id: projectVersion.id },
    data: {
      status: FoundationRecordStatus.Published,
      publishedAt: new Date(),
      snapshotHash: "4".repeat(64),
    },
  })
  await prisma.projectResponseCodeConfiguration.create({
    data: {
      projectId: baseline.project.id,
      codeSetVersionId: projectVersion.id,
      configuredByUserId: baseline.actor.id,
    },
  })
  const resolved = await resolvePublishedResponsePolicy({
    projectId: baseline.project.id,
    clientId: baseline.client.id,
  })
  assert.equal(resolved?.id, projectVersion.id)
  assert.equal(resolved?.codes[0]?.externalCode, "2")

  const definition = toDefinition(projectVersion.codes[0]!)
  const snapshot = responsePolicySnapshot({
    codeSetId: projectSet.id,
    versionId: projectVersion.id,
    version: projectVersion.version,
    code: definition,
  })
  const storedSnapshot = await prisma.clientResponsePolicySnapshot.create({
    data: {
      projectId: baseline.project.id,
      codeSetVersionId: projectVersion.id,
      snapshotHash: snapshot.hash,
      content: snapshot.content,
    },
  })
  const responseFile = await prisma.fileObject.create({
    data: {
      storageProvider: StorageProvider.LOCAL_TEMPORARY_ARTIFACT,
      providerKey: "phase-11/comment-sheet.pdf",
      fileName: "comment-sheet.pdf",
      mimeType: "application/pdf",
      sizeBytes: 20n,
      checksum: "5".repeat(64),
    },
  })
  const attachment = await prisma.fileObject.create({
    data: {
      storageProvider: StorageProvider.LOCAL_TEMPORARY_ARTIFACT,
      providerKey: "phase-11/markup.xlsx",
      fileName: "markup.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 10n,
      checksum: "6".repeat(64),
    },
  })
  const historical = await prisma.clientResponse.create({
    data: {
      revisionId: fixture.revision.id,
      submissionId: submission.id,
      policySnapshotId: storedSnapshot.id,
      responseCodeId: projectVersion.codes[0]!.id,
      externalCodeSnapshot: "2",
      labelSnapshot: "Conditional approval",
      outcomeClass: "CONDITIONALLY_APPROVED",
      effectsSnapshot: definition.effects,
      incomingReference: "CLIENT-RESP-001",
      isActive: false,
      supersededAt: new Date(),
    },
  })
  const current = await prisma.clientResponse.create({
    data: {
      revisionId: fixture.revision.id,
      submissionId: submission.id,
      policySnapshotId: storedSnapshot.id,
      responseCodeId: projectVersion.codes[0]!.id,
      externalCodeSnapshot: "2",
      labelSnapshot: "Conditional approval",
      outcomeClass: "CONDITIONALLY_APPROVED",
      effectsSnapshot: definition.effects,
      incomingReference: "CLIENT-RESP-002",
      primaryFileObjectId: responseFile.id,
      primaryFileKind: "COMMENT_SHEET",
      isActive: true,
    },
  })
  await prisma.clientResponseFile.createMany({
    data: [
      {
        clientResponseId: current.id,
        fileObjectId: responseFile.id,
        fileKind: "COMMENT_SHEET",
        isPrimary: true,
        originalFileName: responseFile.fileName,
      },
      {
        clientResponseId: current.id,
        fileObjectId: attachment.id,
        fileKind: "ATTACHMENT",
        attachmentKind: "MARKUP",
        originalFileName: attachment.fileName,
      },
    ],
  })

  assert.equal(
    await prisma.clientResponse.count({
      where: { revisionId: fixture.revision.id },
    }),
    2
  )
  assert.equal(
    (
      await prisma.clientResponse.findFirstOrThrow({
        where: { revisionId: fixture.revision.id, isActive: true },
      })
    ).id,
    current.id
  )
  assert.equal(
    await prisma.clientResponseFile.count({
      where: { clientResponseId: current.id },
    }),
    2
  )
  assert.equal(historical.isActive, false)
  await assert.rejects(
    prisma.clientResponseCode.update({
      where: { id: projectVersion.codes[0]!.id },
      data: { exactWording: "Mutated wording" },
    }),
    /Published response-code content is immutable/
  )
})

test("Phase 12 verifies codes, local hashes, seals, privacy, rate evidence, and tamper", async () => {
  const baseline = await createCharacterizationBaseline()
  const fixture = await createDocumentFixture(baseline)
  const canonicalBytes = Buffer.from('{"phase":12,"stable":true}', "utf8")
  const packageHash = createHash("sha256").update(canonicalBytes).digest("hex")
  const manifest = await prisma.packageManifest.create({
    data: {
      revisionId: fixture.revision.id,
      schemaVersion: "1",
      canonicalizationVersion: "phase-12-test",
      manifestJson: { phase: 12, stable: true },
      canonicalBytes,
      manifestDigest: packageHash,
      hashes: {
        create: { algorithm: "SHA-256", value: packageHash },
      },
    },
  })
  const provider = new TestPlatformSealProvider("test")
  const signature = await provider.sign(canonicalBytes)
  await prisma.signingKeyRegistry.create({
    data: {
      keyId: provider.keyId,
      algorithm: provider.algorithm,
      publicKeyPem: TEST_PUBLIC_KEY,
      status: "RETIRED",
      retiredAt: new Date(),
    },
  })
  await prisma.platformSeal.create({
    data: {
      manifestId: manifest.id,
      provider: provider.provider,
      algorithm: provider.algorithm,
      keyId: provider.keyId,
      signature,
      status: "Verified",
      publicKeyReference: provider.publicKeyReference(),
      signedPayloadVersion: "1",
      verificationStatus: "VALID",
    },
  })
  await prisma.publicVerificationPolicy.create({
    data: {
      projectId: baseline.project.id,
      version: 1,
      fields: {
        documentNumber: true,
        revision: true,
        client: false,
        project: false,
        internalApprovalStatus: true,
        clientResponseStatus: true,
        finalApprovalStatus: true,
        completionDate: true,
        packageMatch: true,
      },
    },
  })
  const issued = issueUnpredictableVerificationCode()
  await prisma.verificationCode.create({
    data: {
      manifestId: manifest.id,
      codeHash: issued.codeHash,
      targetType: "PACKAGE_MANIFEST",
      targetId: manifest.id,
    },
  })

  const valid = await verifyPublicCode({
    code: issued.code,
    observedHash: packageHash,
    requestFingerprint: "phase-12-valid",
  })
  assert.equal(valid.status, "VALID")
  assert.equal(valid.documentNumber, fixture.document.dtgsaDocumentNumber)
  assert.equal(valid.client, undefined)
  assert.equal(valid.project, undefined)
  assert.equal(valid.packageMatch, true)
  assert.deepEqual(valid.seal, {
    algorithm: "Ed25519",
    keyId: provider.keyId,
    keyStatus: "RETIRED",
    payloadVersion: "1",
    pades: false,
  })

  const modified = await verifyPublicCode({
    code: issued.code,
    observedHash: "f".repeat(64),
    requestFingerprint: "phase-12-modified",
  })
  assert.equal(modified.status, "TAMPER_DETECTED")
  assert.equal(modified.packageMatch, false)
  const unknown = await verifyPublicCode({
    code: "unknown-code",
    requestFingerprint: "phase-12-unknown",
  })
  assert.equal(unknown.status, "INVALID_HASH")
  assert.equal(await prisma.verificationAttempt.count(), 3)
  assert.equal(await prisma.verificationRecord.count(), 2)
  for (let index = 0; index < 21; index += 1) {
    await verifyPublicCode({
      code: `rate-limit-${index}`,
      requestFingerprint: "phase-12-rate-limit",
    })
  }
  assert.equal(
    await prisma.verificationAttempt.count({
      where: {
        requestFingerprintHash: {
          not: {
            equals: (
              await prisma.verificationAttempt.findFirstOrThrow({
                where: { codeHash: issued.codeHash },
              })
            ).requestFingerprintHash,
          },
        },
      },
    }),
    22
  )
})
