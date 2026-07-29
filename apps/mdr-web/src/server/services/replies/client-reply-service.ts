import "server-only"
import {
  AuditSeverity,
  ClientReplyNextAction,
  ClientReplyState,
  DocumentFileType,
  DriveFolderType,
  RevisionStatus,
  ScopeLevel,
  WorkflowActionType,
  WorkflowStatus,
} from "@prisma/client"
import { z } from "zod"
import {
  PERMISSIONS,
  ROLE_CODES,
  hasAnyPermission,
} from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { generateDocumentNumber } from "@/server/services/numbering/document-numbering-service"
import { notifyProjectRoles } from "@/server/services/notifications/notification-service"
import {
  getNextRevisionLabel,
  resolveRejectedIdentifier,
  resolveReplyState,
  sanitizeFileName,
} from "@/server/services/replies/client-reply-policy"
import {
  buildStorageKey,
  uploadBytesToStorage,
} from "@/server/services/storage/storage-service"
import { seedWorkflowStepsForRevision } from "@/server/services/workflow/workflow-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const GLOBAL_SCOPE_KEY = "system"

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const createClientReplySchema = z.object({
  documentId: z.string().trim().min(1),
  reviewCodeId: z.string().trim().min(1),
  nextAction: z.nativeEnum(ClientReplyNextAction),
  transmittalId: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().optional()
  ),
  driveTargetFolderType: z.preprocess(
    emptyStringToUndefined,
    z.nativeEnum(DriveFolderType).optional()
  ),
  replyDate: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
  comments: z.preprocess(
    emptyStringToUndefined,
    z.string().max(4000).optional()
  ),
  returnedFileName: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(255).optional()
  ),
})

function isFileLike(value: unknown): value is File {
  return value instanceof File && value.size > 0
}

function getProjectRoleCodes(user: CurrentAppUser, projectId: string) {
  return user.projectRoles
    .filter((item) => item.projectId === projectId)
    .map((item) => item.role.code)
}

function assertProjectPermission(
  user: CurrentAppUser,
  projectId: string,
  permission: keyof typeof PERMISSIONS
) {
  const systemRoles = user.userRoles.map((item) => item.role.code)
  const projectRoles = getProjectRoleCodes(user, projectId)

  if (
    !hasAnyPermission({
      required: PERMISSIONS[permission],
      systemRoles,
      projectRoles,
    })
  ) {
    throw new Error("You do not have permission to process client replies.")
  }
}

export async function recordClientReply(
  actor: CurrentAppUser,
  input: {
    documentId: unknown
    reviewCodeId: unknown
    nextAction: unknown
    transmittalId: unknown
    driveTargetFolderType: unknown
    replyDate: unknown
    comments: unknown
    returnedFileName: unknown
    file?: unknown
  }
) {
  const parsed = createClientReplySchema.parse(input)
  const returnedFile = isFileLike(input.file) ? input.file : null

  const document = await prisma.mdrDocument.findUnique({
    where: {
      id: parsed.documentId,
    },
    include: {
      project: {
        include: {
          setting: true,
          client: {
            include: {
              setting: true,
            },
          },
        },
      },
      discipline: true,
      documentTypeCategory: true,
      releasePurpose: true,
      currentRevision: true,
    },
  })

  if (!document || document.deletedAt) {
    throw new Error("The selected document could not be found.")
  }

  if (!document.currentRevision) {
    throw new Error("The selected document does not have an active revision.")
  }

  assertProjectPermission(actor, document.projectId, "clientRepliesManage")

  if (document.currentWorkflowStatus !== WorkflowStatus.SubmittedToClient) {
    throw new Error(
      "Only documents already submitted to the client can receive a client reply."
    )
  }

  const reviewCode = await prisma.reviewCode.findUnique({
    where: {
      id: parsed.reviewCodeId,
    },
  })

  if (
    !reviewCode ||
    !reviewCode.isActive ||
    !(
      reviewCode.projectId === document.projectId ||
      reviewCode.clientId === document.project.clientId ||
      (reviewCode.scopeLevel === ScopeLevel.Global &&
        reviewCode.scopeKey === GLOBAL_SCOPE_KEY)
    )
  ) {
    throw new Error("The selected review code is not valid for this project.")
  }

  if (parsed.transmittalId) {
    const linkedItem = await prisma.transmittalItem.findFirst({
      where: {
        transmittalId: parsed.transmittalId,
        documentRevision: {
          documentId: document.id,
        },
      },
      select: {
        id: true,
      },
    })

    if (!linkedItem) {
      throw new Error(
        "The selected transmittal does not contain this document revision."
      )
    }
  }

  const replyState = resolveReplyState({
    requiresResubmittal: reviewCode.requiresResubmittal,
    finalizesDocument: reviewCode.finalizesDocument,
    informationalOnly: reviewCode.informationalOnly,
  })

  const driveTargetFolderType =
    parsed.driveTargetFolderType ??
    (replyState === ClientReplyState.RevisionRequired
      ? DriveFolderType.REJECTED
      : DriveFolderType.RECEIVED)

  const generatedRejectedFileName =
    replyState === ClientReplyState.RevisionRequired
      ? `Rej-${resolveRejectedIdentifier({
          strategy: document.project.setting?.rejectedFileIdentifierStrategy,
          dtgsaDocumentNumber: document.dtgsaDocumentNumber,
          clientDocumentNumber: document.clientDocumentNumber,
        })}.pdf`
      : null

  const driveFileName =
    generatedRejectedFileName ??
    (returnedFile ? sanitizeFileName(returnedFile.name) : null) ??
    parsed.returnedFileName?.trim() ??
    null

  const replyDate = parsed.replyDate ?? new Date()
  const uploadedReturnedFile = returnedFile
    ? (() => {
        const fileName = generatedRejectedFileName
          ? generatedRejectedFileName
          : sanitizeFileName(
              parsed.returnedFileName?.trim() || returnedFile.name
            )

        return {
          fileName,
          bytesPromise: returnedFile
            .arrayBuffer()
            .then((buffer) => Buffer.from(buffer)),
          mimeType: returnedFile.type || "application/octet-stream",
          fileSizeBytes: returnedFile.size,
        }
      })()
    : null

  const replyFileUpload = uploadedReturnedFile
    ? await uploadBytesToStorage({
        area: "source",
        providerKeyHint: buildStorageKey(
          "projects",
          document.project.code,
          document.dtgsaDocumentNumber,
          "client-replies",
          `rev-${document.currentRevision.revisionLabel}`,
          uploadedReturnedFile.fileName
        ),
        bytes: await uploadedReturnedFile.bytesPromise,
        fileName: uploadedReturnedFile.fileName,
        mimeType: uploadedReturnedFile.mimeType,
      })
    : null

  const result = await prisma.$transaction(async (tx) => {
    const reply = await tx.clientReply.create({
      data: {
        projectId: document.projectId,
        documentId: document.id,
        documentRevisionId: document.currentRevisionId,
        transmittalId: parsed.transmittalId ?? null,
        reviewCodeId: reviewCode.id,
        replyState,
        nextAction: parsed.nextAction,
        replyDate,
        comments: parsed.comments?.trim() || null,
        driveTargetFolderType,
        driveFileName: replyFileUpload?.fileName ?? driveFileName,
        driveFileId: replyFileUpload?.providerKey ?? null,
        createdByUserId: actor.id,
      },
    })

    if (replyFileUpload) {
      await tx.documentFile.create({
        data: {
          documentRevisionId: document.currentRevisionId!,
          projectId: document.projectId,
          type:
            replyState === ClientReplyState.RevisionRequired
              ? DocumentFileType.REJECTED
              : DocumentFileType.CLIENT_REPLY,
          storageProvider: replyFileUpload.storageProvider,
          providerKey: replyFileUpload.providerKey,
          fileName: replyFileUpload.fileName,
          mimeType: replyFileUpload.mimeType,
          fileSizeBytes: replyFileUpload.fileSizeBytes,
          checksum: replyFileUpload.checksum,
          uploadedByUserId: actor.id,
        },
      })
    }

    await tx.workflowAction.create({
      data: {
        documentRevisionId: document.currentRevision!.id,
        actionType: WorkflowActionType.ClientReplyRecorded,
        actorUserId: actor.id,
        fromStatus: document.currentRevision!.workflowStatus,
        toStatus: document.currentRevision!.workflowStatus,
        comments: parsed.comments?.trim() || null,
        metadata: {
          clientReplyId: reply.id,
          reviewCode: reviewCode.code,
          nextAction: parsed.nextAction,
        },
      },
    })

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "client_reply.record",
        entityType: "ClientReply",
        entityId: reply.id,
        projectId: document.projectId,
        clientId: document.project.clientId,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          documentId: document.id,
          revisionId: document.currentRevisionId,
          reviewCode: reviewCode.code,
          nextAction: parsed.nextAction,
          replyState,
          driveFileName: replyFileUpload?.fileName ?? driveFileName,
          providerKey: replyFileUpload?.providerKey ?? null,
        },
      },
    })

    if (parsed.nextAction === ClientReplyNextAction.REVISION_REQUIRED) {
      const nextRevision = await tx.documentRevision.create({
        data: {
          documentId: document.id,
          revisionLabel: getNextRevisionLabel(
            document.currentRevision!.revisionLabel
          ),
          revisionIndex: document.currentRevision!.revisionIndex + 1,
          workflowStatus: WorkflowStatus.Draft,
          revisionStatus: RevisionStatus.RevisionInProgress,
          clientReplyState: ClientReplyState.WaitingClientReply,
          parentRevisionId: document.currentRevision!.id,
          sourceClientReplyId: reply.id,
          reasonForRevision:
            parsed.comments?.trim() ||
            `Revision required from client reply ${reviewCode.code}.`,
          isCurrent: true,
          createdByUserId: actor.id,
        },
      })

      await seedWorkflowStepsForRevision(tx, nextRevision.id)

      await tx.documentRevision.update({
        where: {
          id: document.currentRevision!.id,
        },
        data: {
          isCurrent: false,
          reviewCodeId: reviewCode.id,
          clientReplyState: replyState,
          revisionStatus: RevisionStatus.Superseded,
        },
      })

      await tx.mdrDocument.update({
        where: {
          id: document.id,
        },
        data: {
          currentRevisionId: nextRevision.id,
          currentWorkflowStatus: WorkflowStatus.Draft,
          currentClientReplyState: ClientReplyState.WaitingClientReply,
          currentReviewCodeId: null,
          isClosed: false,
          lockedAt: null,
        },
      })

      await tx.workflowAction.create({
        data: {
          documentRevisionId: nextRevision.id,
          actionType: WorkflowActionType.RevisionTriggered,
          actorUserId: actor.id,
          comments: parsed.comments?.trim() || null,
          metadata: {
            clientReplyId: reply.id,
            previousRevisionId: document.currentRevision!.id,
          },
        },
      })

      return {
        replyId: reply.id,
        followUp: `New revision ${nextRevision.revisionLabel} created`,
      }
    }

    if (
      parsed.nextAction === ClientReplyNextAction.NEW_DOCUMENT_NUMBER_REQUIRED
    ) {
      const numberGeneration = await generateDocumentNumber({
        db: tx,
        project: {
          id: document.project.id,
          code: document.project.code,
          client: {
            id: document.project.client.id,
            code: document.project.client.code,
          },
        },
        discipline: {
          id: document.discipline.id,
          code: document.discipline.code,
        },
        documentTypeCategory: document.documentTypeCategory,
        releasePurpose: document.releasePurpose,
        revision: "00",
      })

      const replacementDocument = await tx.mdrDocument.create({
        data: {
          projectId: document.projectId,
          disciplineId: document.disciplineId,
          documentTypeCategoryId: document.documentTypeCategoryId,
          releasePurposeId: document.releasePurposeId,
          dtgsaDocumentNumber: numberGeneration.dtgsaDocumentNumber,
          clientDocumentNumber: null,
          title: document.title,
          remarks: document.remarks,
          currentWorkflowStatus: WorkflowStatus.Draft,
          currentClientReplyState: ClientReplyState.WaitingClientReply,
          createdByUserId: actor.id,
        },
      })

      const replacementRevision = await tx.documentRevision.create({
        data: {
          documentId: replacementDocument.id,
          revisionLabel: "00",
          revisionIndex: 0,
          workflowStatus: WorkflowStatus.Draft,
          revisionStatus: RevisionStatus.RevisionInProgress,
          clientReplyState: ClientReplyState.WaitingClientReply,
          sourceClientReplyId: reply.id,
          reasonForRevision:
            parsed.comments?.trim() ||
            `New document number required from client reply ${reviewCode.code}.`,
          isCurrent: true,
          createdByUserId: actor.id,
        },
      })

      await seedWorkflowStepsForRevision(tx, replacementRevision.id)

      await tx.mdrDocument.update({
        where: {
          id: replacementDocument.id,
        },
        data: {
          currentRevisionId: replacementRevision.id,
        },
      })

      await tx.documentRevision.update({
        where: {
          id: document.currentRevision!.id,
        },
        data: {
          isCurrent: false,
          reviewCodeId: reviewCode.id,
          clientReplyState: replyState,
          revisionStatus: RevisionStatus.Superseded,
          lockedAt: replyDate,
        },
      })

      await tx.mdrDocument.update({
        where: {
          id: document.id,
        },
        data: {
          currentClientReplyState: replyState,
          currentReviewCodeId: reviewCode.id,
          isClosed: true,
          lockedAt: replyDate,
        },
      })

      await tx.workflowAction.create({
        data: {
          documentRevisionId: replacementRevision.id,
          actionType: WorkflowActionType.RevisionTriggered,
          actorUserId: actor.id,
          comments: parsed.comments?.trim() || null,
          metadata: {
            clientReplyId: reply.id,
            sourceDocumentId: document.id,
            replacementDocumentId: replacementDocument.id,
          },
        },
      })

      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "client_reply.new_document_created",
          entityType: "MdrDocument",
          entityId: replacementDocument.id,
          projectId: document.projectId,
          clientId: document.project.clientId,
          severity: AuditSeverity.Info,
          afterSnapshot: {
            sourceDocumentId: document.id,
            replacementDocumentId: replacementDocument.id,
            replacementDtgsaDocumentNumber:
              replacementDocument.dtgsaDocumentNumber,
            clientReplyId: reply.id,
          },
        },
      })

      return {
        replyId: reply.id,
        followUp: `New document ${replacementDocument.dtgsaDocumentNumber} created`,
      }
    }

    await tx.documentRevision.update({
      where: {
        id: document.currentRevision!.id,
      },
      data: {
        reviewCodeId: reviewCode.id,
        clientReplyState: replyState,
        revisionStatus: reviewCode.finalizesDocument
          ? RevisionStatus.Closed
          : document.currentRevision!.revisionStatus,
        closedAt: reviewCode.finalizesDocument ? replyDate : null,
        lockedAt: reviewCode.finalizesDocument ? replyDate : null,
      },
    })

    await tx.mdrDocument.update({
      where: {
        id: document.id,
      },
      data: {
        currentClientReplyState: replyState,
        currentReviewCodeId: reviewCode.id,
        isClosed: reviewCode.finalizesDocument,
        lockedAt: reviewCode.finalizesDocument ? replyDate : null,
      },
    })

    return {
      replyId: reply.id,
      followUp: "Reply recorded without a new revision",
    }
  })

  await notifyProjectRoles({
    projectId: document.projectId,
    clientId: document.project.clientId,
    roleCodes: [
      ROLE_CODES.documentControlAdmin,
      ROLE_CODES.documentControlUser,
      ROLE_CODES.disciplineUser,
      ROLE_CODES.reviewer,
      ROLE_CODES.approver,
    ],
    excludeUserIds: [actor.id],
    title: `Client reply recorded for ${document.dtgsaDocumentNumber}`,
    body: `${reviewCode.code} was applied and the next action is ${parsed.nextAction}. ${result.followUp}.`,
    actionUrl: "/replies",
    metadata: {
      documentId: document.id,
      clientReplyId: result.replyId,
      reviewCode: reviewCode.code,
      nextAction: parsed.nextAction,
    },
    requestEmailDelivery: true,
  })
}
