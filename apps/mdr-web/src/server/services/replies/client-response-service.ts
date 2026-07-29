import "server-only"
import { createHash, randomUUID } from "node:crypto"
import {
  AuditSeverity,
  ClientReplyState,
  ClientResponseFileKind,
  ClientResponseOutcomeClass,
  FoundationRecordStatus,
  IntegrityStatus,
  Prisma,
  RevisionStatus,
  WorkflowActionType,
  WorkflowStatus,
} from "@prisma/client"
import {
  buildClientResponseAssemblyProfile,
  canCloseFromResponse,
  deriveRevisionDirective,
  nextRevisionLabel,
  responsePolicySnapshot,
  type ClientResponseEffects,
} from "@dtg/client-response-domain"
import { createArtifactCacheKey } from "@dtg/job-engine"
import { z } from "zod"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import {
  codeEffects,
  resolvePublishedResponsePolicy,
  toDefinition,
} from "@/server/services/replies/client-response-policy-service"
import {
  buildStorageKey,
  uploadBytesToStorage,
} from "@/server/services/storage/storage-service"
import { seedWorkflowStepsForRevision } from "@/server/services/workflow/workflow-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const responseSchema = z.object({
  submissionId: z.string().trim().min(1),
  responseCodeId: z.string().trim().min(1),
  incomingReference: z.string().trim().min(1).max(200),
  responseDate: z.coerce.date(),
  clientReviewerName: z.string().trim().max(200).optional(),
  clientReviewerDate: z.coerce.date().optional(),
  primaryFileKind: z.nativeEnum(ClientResponseFileKind),
  comments: z.string().trim().max(4000).optional(),
})

function assertResponseAccess(actor: CurrentAppUser, projectId: string) {
  const allowed = hasAnyPermission({
    required: [PERMISSIONS.clientRepliesManage],
    systemRoles: actor.userRoles.map((item) => item.role.code),
    projectRoles: actor.projectRoles
      .filter((item) => item.projectId === projectId)
      .map((item) => item.role.code),
  })
  if (!allowed) {
    throw new Error("You do not have permission to register client responses.")
  }
}

function isFile(value: unknown): value is File {
  return value instanceof File && value.size > 0
}

function mapLegacyReplyState(effects: ClientResponseEffects) {
  if (effects.newRevisionRequired || effects.newDocumentNumberRequired) {
    return ClientReplyState.RevisionRequired
  }
  if (effects.outcomeClass === "INFORMATION_ONLY") {
    return ClientReplyState.InformationOnly
  }
  if (canCloseFromResponse(effects)) {
    return ClientReplyState.NoFurtherSubmittal
  }
  return ClientReplyState.ReplyReceived
}

async function uploadResponseFile(input: {
  actorId: string
  projectCode: string
  documentNumber: string
  responseId: string
  file: File
}) {
  const bytes = Buffer.from(await input.file.arrayBuffer())
  const checksum = createHash("sha256").update(bytes).digest("hex")
  const safeName = input.file.name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 180)
  const uploaded = await uploadBytesToStorage({
    area: "source",
    providerKeyHint: buildStorageKey(
      "projects",
      input.projectCode,
      input.documentNumber,
      "client-responses",
      input.responseId,
      `${randomUUID()}-${safeName}`
    ),
    bytes,
    fileName: safeName,
    mimeType: input.file.type || "application/octet-stream",
  })
  return {
    uploaded,
    checksum,
    fileObject: await prisma.fileObject.create({
      data: {
        storageProvider: uploaded.storageProvider,
        providerKey: uploaded.providerKey,
        fileName: safeName,
        mimeType: uploaded.mimeType,
        sizeBytes: BigInt(uploaded.fileSizeBytes),
        checksum,
      },
    }),
  }
}

export async function getConfigurableClientResponseOverview(
  actor: CurrentAppUser,
  filters: {
    outcomeClass?: string
    action?: "REVISION_REQUIRED" | "OVERDUE" | "ALL"
  } = {}
) {
  const submissions = await prisma.clientSubmission.findMany({
    orderBy: { submittedAt: "desc" },
  })
  const rows = await Promise.all(
    submissions.map(async (submission) => {
      const revision = await prisma.documentRevision.findUnique({
        where: { id: submission.revisionId },
        include: {
          document: { include: { project: { include: { client: true } } } },
        },
      })
      if (!revision) return null
      try {
        assertResponseAccess(actor, revision.document.projectId)
      } catch {
        return null
      }
      const policy = await resolvePublishedResponsePolicy({
        projectId: revision.document.projectId,
        clientId: revision.document.project.clientId,
      })
      return {
        id: submission.id,
        submissionNumber: submission.submissionNumber,
        submittedAt: submission.submittedAt,
        packageHash: submission.packageHash,
        documentNumber: revision.document.dtgsaDocumentNumber,
        title: revision.document.title,
        revisionLabel: revision.revisionLabel,
        projectCode: revision.document.project.code,
        projectName: revision.document.project.name,
        policy: policy
          ? {
              id: policy.id,
              name: policy.codeSet.name,
              version: policy.version,
              codes: policy.codes.map((code) => ({
                id: code.id,
                externalCode: code.externalCode,
                exactWording: code.exactWording,
                internalLabel: code.internalLabel,
                effects: codeEffects(code),
              })),
            }
          : null,
      }
    })
  )
  const visibleSubmissions = rows.filter((row) => row !== null)
  const visibleSubmissionIds = visibleSubmissions.map((row) => row.id)
  const visibleRevisionIds = submissions
    .filter((submission) => visibleSubmissionIds.includes(submission.id))
    .map((submission) => submission.revisionId)
  const outcomeClass =
    filters.outcomeClass &&
    Object.values(ClientResponseOutcomeClass).includes(
      filters.outcomeClass as ClientResponseOutcomeClass
    )
      ? (filters.outcomeClass as ClientResponseOutcomeClass)
      : undefined
  const responses = await prisma.clientResponse.findMany({
    where: {
      revisionId: { in: visibleRevisionIds },
      ...(outcomeClass ? { outcomeClass } : {}),
    },
    orderBy: { receivedAt: "desc" },
  })
  const [responseFiles, policySnapshots] = await Promise.all([
    prisma.clientResponseFile.findMany({
      where: {
        clientResponseId: { in: responses.map((response) => response.id) },
      },
      orderBy: [{ isPrimary: "desc" }, { receivedAt: "asc" }],
    }),
    prisma.clientResponsePolicySnapshot.findMany({
      where: {
        id: { in: responses.map((response) => response.policySnapshotId) },
      },
    }),
  ])
  const filesByResponse = new Map<string, typeof responseFiles>()
  for (const file of responseFiles) {
    const files = filesByResponse.get(file.clientResponseId) ?? []
    files.push(file)
    filesByResponse.set(file.clientResponseId, files)
  }
  const snapshotById = new Map(
    policySnapshots.map((snapshot) => [snapshot.id, snapshot])
  )
  const now = Date.now()
  const enrichedResponses = responses
    .map((response) => {
      const effects =
        (response.effectsSnapshot as unknown as ClientResponseEffects | null) ??
        null
      const revisionRequired =
        effects?.newRevisionRequired === true ||
        effects?.newDocumentNumberRequired === true
      const overdue =
        response.isActive &&
        revisionRequired &&
        !response.triggeredRevisionId &&
        now - response.receivedAt.getTime() > 7 * 24 * 60 * 60 * 1000
      return {
        ...response,
        files: filesByResponse.get(response.id) ?? [],
        policySnapshot: snapshotById.get(response.policySnapshotId) ?? null,
        revisionRequired,
        overdue,
      }
    })
    .filter((response) => {
      if (filters.action === "REVISION_REQUIRED") {
        return response.revisionRequired && !response.triggeredRevisionId
      }
      if (filters.action === "OVERDUE") return response.overdue
      return true
    })
  return {
    submissions: visibleSubmissions,
    responses: enrichedResponses,
    counts: {
      total: enrichedResponses.length,
      revisionRequired: enrichedResponses.filter(
        (response) => response.revisionRequired && !response.triggeredRevisionId
      ).length,
      overdue: enrichedResponses.filter((response) => response.overdue).length,
    },
  }
}

export async function registerConfiguredClientResponse(
  actor: CurrentAppUser,
  input: {
    submissionId: unknown
    responseCodeId: unknown
    incomingReference: unknown
    responseDate: unknown
    clientReviewerName: unknown
    clientReviewerDate: unknown
    primaryFileKind: unknown
    comments: unknown
    primaryFile: unknown
    attachments: unknown[]
  }
) {
  const parsed = responseSchema.parse({
    ...input,
    clientReviewerName: input.clientReviewerName || undefined,
    clientReviewerDate: input.clientReviewerDate || undefined,
    comments: input.comments || undefined,
  })
  const submission = await prisma.clientSubmission.findUnique({
    where: { id: parsed.submissionId },
  })
  if (!submission)
    throw new Error("The selected client submission was not found.")
  const revision = await prisma.documentRevision.findUnique({
    where: { id: submission.revisionId },
    include: {
      document: { include: { project: { include: { client: true } } } },
    },
  })
  if (!revision) throw new Error("The submitted revision was not found.")
  assertResponseAccess(actor, revision.document.projectId)

  const policy = await resolvePublishedResponsePolicy({
    projectId: revision.document.projectId,
    clientId: revision.document.project.clientId,
  })
  const code = policy?.codes.find((item) => item.id === parsed.responseCodeId)
  if (!policy || !code || policy.status !== FoundationRecordStatus.Published) {
    throw new Error(
      "The selected response code is not in the published policy."
    )
  }
  const effects = codeEffects(code)
  if (
    effects.expectedFileKind &&
    effects.expectedFileKind !== parsed.primaryFileKind
  ) {
    throw new Error(
      `This response requires a ${effects.expectedFileKind} primary file.`
    )
  }
  const primaryFile = isFile(input.primaryFile) ? input.primaryFile : null
  if (effects.returnedFileRequired && !primaryFile) {
    throw new Error("The published response policy requires a returned file.")
  }
  if (!primaryFile) {
    throw new Error("One Primary Response File is required.")
  }
  const attachments = input.attachments.filter(isFile)
  const responseId = `cr_${randomUUID().replaceAll("-", "")}`
  const [primaryUpload, ...attachmentUploads] = await Promise.all([
    uploadResponseFile({
      actorId: actor.id,
      projectCode: revision.document.project.code,
      documentNumber: revision.document.dtgsaDocumentNumber,
      responseId,
      file: primaryFile,
    }),
    ...attachments.map((file) =>
      uploadResponseFile({
        actorId: actor.id,
        projectCode: revision.document.project.code,
        documentNumber: revision.document.dtgsaDocumentNumber,
        responseId,
        file,
      })
    ),
  ])
  const snapshot = responsePolicySnapshot({
    codeSetId: policy.codeSetId,
    versionId: policy.id,
    version: policy.version,
    code: toDefinition(code),
  })
  const replyState = mapLegacyReplyState(effects)
  const close = canCloseFromResponse(effects)

  return prisma.$transaction(async (tx) => {
    const policySnapshot = await tx.clientResponsePolicySnapshot.upsert({
      where: { snapshotHash: snapshot.hash },
      create: {
        projectId: revision.document.projectId,
        codeSetVersionId: policy.id,
        snapshotHash: snapshot.hash,
        content: snapshot.content as Prisma.InputJsonValue,
      },
      update: {},
    })
    await tx.clientResponse.updateMany({
      where: { revisionId: revision.id, isActive: true },
      data: { isActive: false, supersededAt: parsed.responseDate },
    })
    const response = await tx.clientResponse.create({
      data: {
        id: responseId,
        revisionId: revision.id,
        submissionId: submission.id,
        policySnapshotId: policySnapshot.id,
        responseCodeId: code.id,
        externalCodeSnapshot: code.externalCode,
        labelSnapshot: code.internalLabel,
        outcomeClass: code.outcomeClass as ClientResponseOutcomeClass,
        effectsSnapshot: effects as unknown as Prisma.InputJsonValue,
        incomingReference: parsed.incomingReference,
        receivedAt: parsed.responseDate,
        clientReviewerName: parsed.clientReviewerName || null,
        clientReviewerDate: parsed.clientReviewerDate || null,
        comments: parsed.comments || null,
        primaryFileObjectId: primaryUpload.fileObject.id,
        primaryFileKind: parsed.primaryFileKind,
        createdByUserId: actor.id,
        confirmedAt: new Date(),
      },
    })
    await tx.clientResponseFile.createMany({
      data: [
        {
          clientResponseId: response.id,
          fileObjectId: primaryUpload.fileObject.id,
          fileKind: parsed.primaryFileKind,
          isPrimary: true,
          originalFileName: primaryFile.name,
        },
        ...attachmentUploads.map((upload, index) => ({
          clientResponseId: response.id,
          fileObjectId: upload.fileObject.id,
          fileKind: "ATTACHMENT",
          isPrimary: false,
          attachmentKind: "SUPPORTING_FILE",
          originalFileName: attachments[index]!.name,
        })),
      ],
    })
    await tx.documentRevision.update({
      where: { id: revision.id },
      data: {
        clientReplyState: replyState,
        revisionStatus: close ? RevisionStatus.Closed : revision.revisionStatus,
        closedAt: close ? parsed.responseDate : null,
        lockedAt: close ? parsed.responseDate : revision.lockedAt,
      },
    })
    await tx.mdrDocument.update({
      where: { id: revision.document.id },
      data: {
        currentClientReplyState: replyState,
        isClosed: close,
        lockedAt: close ? parsed.responseDate : null,
      },
    })
    await tx.workflowAction.create({
      data: {
        documentRevisionId: revision.id,
        actionType: WorkflowActionType.ClientReplyRecorded,
        actorUserId: actor.id,
        fromStatus: revision.workflowStatus,
        toStatus: revision.workflowStatus,
        comments: parsed.comments || null,
        metadata: {
          clientResponseId: response.id,
          externalCode: code.externalCode,
          outcomeClass: code.outcomeClass,
          effects,
          policySnapshotHash: snapshot.hash,
        },
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "client_response.recorded",
        entityType: "ClientResponse",
        entityId: response.id,
        projectId: revision.document.projectId,
        clientId: revision.document.project.clientId,
        severity: AuditSeverity.Info,
        relevantHashes: {
          policySnapshotHash: snapshot.hash,
          primaryFileHash: primaryUpload.checksum,
          packageHash: submission.packageHash,
        },
        afterSnapshot: {
          submissionId: submission.id,
          externalCode: code.externalCode,
          label: code.internalLabel,
          effects,
          fileKind: parsed.primaryFileKind,
          attachmentCount: attachmentUploads.length,
        },
      },
    })
    return {
      responseId: response.id,
      revisionDirective: deriveRevisionDirective(effects),
    }
  })
}

export async function createRevisionFromClientResponse(
  actor: CurrentAppUser,
  input: {
    responseId: string
    workingMainPdf: File
    reason?: string
  }
) {
  const response = await prisma.clientResponse.findUnique({
    where: { id: input.responseId },
  })
  if (!response || !response.isActive) {
    throw new Error("The active client response was not found.")
  }
  const effects = response.effectsSnapshot as unknown as ClientResponseEffects
  if (deriveRevisionDirective(effects) === "NO_REVISION") {
    throw new Error("The response policy does not require a new revision.")
  }
  const revision = await prisma.documentRevision.findUnique({
    where: { id: response.revisionId },
    include: {
      document: { include: { project: { include: { client: true } } } },
    },
  })
  if (!revision) throw new Error("The source revision was not found.")
  assertResponseAccess(actor, revision.document.projectId)
  if (!isFile(input.workingMainPdf)) {
    throw new Error(
      "A new Google Drive working Main PDF selection is required."
    )
  }
  if (
    input.workingMainPdf.type !== "application/pdf" &&
    !input.workingMainPdf.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("The new controlled Main file must be a PDF.")
  }
  const uploaded = await uploadResponseFile({
    actorId: actor.id,
    projectCode: revision.document.project.code,
    documentNumber: revision.document.dtgsaDocumentNumber,
    responseId: `revision-${response.id}`,
    file: input.workingMainPdf,
  })
  const nextLabel = nextRevisionLabel(revision.revisionLabel)
  const unresolvedComments = await prisma.comment.findMany({
    where: {
      revisionId: revision.id,
      state: { in: ["Open", "Reopened"] },
    },
    select: { id: true },
  })
  const manifestJson = {
    schemaVersion: "1",
    documentNumber: revision.document.dtgsaDocumentNumber,
    revision: nextLabel,
    mainFileObjectId: uploaded.fileObject.id,
    mainFileSha256: uploaded.checksum,
    sourceClientResponseId: response.id,
  }
  const packageHash = createHash("sha256")
    .update(JSON.stringify(manifestJson))
    .digest("hex")

  return prisma.$transaction(async (tx) => {
    const nextRevision = await tx.documentRevision.create({
      data: {
        documentId: revision.documentId,
        revisionLabel: nextLabel,
        revisionIndex: revision.revisionIndex + 1,
        workflowStatus: WorkflowStatus.Draft,
        revisionStatus: RevisionStatus.RevisionInProgress,
        clientReplyState: ClientReplyState.WaitingClientReply,
        parentRevisionId: revision.id,
        sourceClientResponseId: response.id,
        reasonForRevision:
          input.reason ||
          response.comments ||
          `Revision required by client response ${response.externalCodeSnapshot}.`,
        isCurrent: true,
        createdByUserId: actor.id,
      },
    })
    await seedWorkflowStepsForRevision(tx, nextRevision.id)
    await tx.controlledMainFile.create({
      data: {
        revisionId: nextRevision.id,
        fileObjectId: uploaded.fileObject.id,
        integrityStatus: IntegrityStatus.Verified,
        verifiedAt: new Date(),
        opaqueFileName: `${randomUUID()}.pdf`,
      },
    })
    const manifest = await tx.packageManifest.create({
      data: {
        revisionId: nextRevision.id,
        schemaVersion: "1",
        canonicalizationVersion: "phase11-json-v1",
        manifestJson,
        manifestDigest: packageHash,
        items: {
          create: {
            itemType: "CONTROLLED_MAIN",
            itemKey: uploaded.fileObject.id,
            checksum: uploaded.checksum,
          },
        },
        hashes: {
          create: { algorithm: "SHA-256", value: packageHash },
        },
      },
    })
    await tx.documentRevision.update({
      where: { id: revision.id },
      data: {
        isCurrent: false,
        revisionStatus: RevisionStatus.Superseded,
        lockedAt: new Date(),
      },
    })
    await tx.mdrDocument.update({
      where: { id: revision.documentId },
      data: {
        currentRevisionId: nextRevision.id,
        currentWorkflowStatus: WorkflowStatus.Draft,
        currentClientReplyState: ClientReplyState.WaitingClientReply,
        isClosed: false,
        lockedAt: null,
      },
    })
    await tx.clientResponse.update({
      where: { id: response.id },
      data: { triggeredRevisionId: nextRevision.id },
    })
    await tx.workflowAction.create({
      data: {
        documentRevisionId: nextRevision.id,
        actionType: WorkflowActionType.RevisionTriggered,
        actorUserId: actor.id,
        metadata: {
          sourceClientResponseId: response.id,
          sourceRevisionId: revision.id,
          unresolvedCommentIds: unresolvedComments.map((item) => item.id),
          internalReapprovalRequired: effects.internalReapprovalRequired,
          signaturesCopied: false,
          manifestId: manifest.id,
          packageHash,
        },
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "client_response.revision_created",
        entityType: "DocumentRevision",
        entityId: nextRevision.id,
        projectId: revision.document.projectId,
        clientId: revision.document.project.clientId,
        relevantHashes: { packageHash, mainFileSha256: uploaded.checksum },
        afterSnapshot: {
          sourceRevisionId: revision.id,
          sourceClientResponseId: response.id,
          revisionLabel: nextLabel,
          signaturesCopied: false,
          unresolvedCommentIds: unresolvedComments.map((item) => item.id),
        },
      },
    })
    return { revisionId: nextRevision.id, packageHash }
  })
}

export async function requestClientResponseDownload(
  actor: CurrentAppUser,
  responseId: string
) {
  const response = await prisma.clientResponse.findUnique({
    where: { id: responseId },
  })
  if (!response || !response.primaryFileObjectId || !response.primaryFileKind) {
    throw new Error("The client response download is unavailable.")
  }
  const [revision, submission, files] = await Promise.all([
    prisma.documentRevision.findUnique({
      where: { id: response.revisionId },
      include: { document: { include: { project: true } } },
    }),
    response.submissionId
      ? prisma.clientSubmission.findUnique({
          where: { id: response.submissionId },
        })
      : null,
    prisma.clientResponseFile.findMany({
      where: { clientResponseId: response.id, isPrimary: false },
      orderBy: { receivedAt: "asc" },
    }),
  ])
  if (
    !revision ||
    !submission?.submittedMainFileObjectId ||
    !submission.packageHash
  ) {
    throw new Error("The exact submitted Main PDF or package hash is missing.")
  }
  assertResponseAccess(actor, revision.document.projectId)
  const profile = buildClientResponseAssemblyProfile({
    fileKind: response.primaryFileKind,
    primaryResponseFileId: response.primaryFileObjectId,
    submittedMainFileId: submission.submittedMainFileObjectId,
    attachmentFileIds: files.map((file) => file.fileObjectId),
  })
  const cacheKey = createArtifactCacheKey(submission.packageHash, {
    responseId,
    ...profile,
  })
  const job = await prisma.backgroundJob.upsert({
    where: { idempotencyKey: `pdf-client-response:${cacheKey}` },
    create: {
      jobType: "PDF_ASSEMBLE_CLIENT_RESPONSE",
      idempotencyKey: `pdf-client-response:${cacheKey}`,
      correlationId: `client-response:${response.id}`,
      priority: 25,
      payload: {
        responseId: response.id,
        revisionId: revision.id,
        requesterUserId: actor.id,
        projectId: revision.document.projectId,
        packageHash: submission.packageHash,
        cacheKey,
        componentFileIds: profile.componentFileIds,
        label: `${profile.label} - ${response.labelSnapshot}`,
        expiresInSeconds: 3600,
      },
    },
    update: {},
  })
  return job
}
