import assert from "node:assert/strict"
import { after, beforeEach, test } from "node:test"
import {
  ClientReplyNextAction,
  ClientReplyState,
  NotificationChannel,
  NotificationStatus,
  PdiStatus,
  RevisionStatus,
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

test("PDI persistence promotes atomically while preserving current ungated status behavior", async () => {
  const baseline = await createCharacterizationBaseline()
  const pdi = await createPdiItem(pdiInput(baseline, "Ungated promotion"))
  assert.equal(pdi.status, PdiStatus.Draft)

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

  const stateWrite = await markPdiItemSentToClient({ pdiItemId: pdi.id })
  assert.equal(stateWrite.status, PdiStatus.ClientNumberPending)
  const numbered = await updatePdiClientDocumentNumber({
    pdiItemId: pdi.id,
    clientDocumentNumber: "CLIENT-001",
  })
  assert.equal(numbered.status, PdiStatus.ClientNumberReceived)

  const rollbackItem = await createPdiItem(
    pdiInput(baseline, "Promotion rollback")
  )
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
    PdiStatus.Draft
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

  const calls = { upload: 0, drive: 0, notify: 0 }
  const adapters: TransmittalDeliveryAdapters = {
    uploadBytes: async (input) => {
      calls.upload += 1
      return {
        bucket: input.bucket,
        path: input.path,
        fileName: input.fileName,
        fileSizeBytes: Buffer.from(input.bytes).length,
        mimeType: input.mimeType,
        checksum: "synthetic-transmittal-checksum",
      }
    },
    uploadToDrive: async () => {
      calls.drive += 1
      return {
        fileId: "synthetic-drive-file",
        folderId: "synthetic-drive-folder",
        webViewLink: null,
      }
    },
    createSignedUrl: async () => "http://127.0.0.1/synthetic.pdf",
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
  await sendTransmittal(baseline.actor, { transmittalId: created.id }, adapters)
  const sent = await prisma.transmittal.findUniqueOrThrow({
    where: { id: created.id },
    include: { generatedDocuments: true },
  })
  assert.equal(sent.status, TransmittalStatus.Sent)
  assert.equal(sent.generatedDocuments.length, 1)
  assert.deepEqual(calls, { upload: 1, drive: 1, notify: 1 })
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
    sendTransmittal(
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
