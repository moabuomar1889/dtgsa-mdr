import "server-only"
import { createHash } from "node:crypto"
import {
  AuditSeverity,
  DocumentFileType,
  WorkflowActionType,
  WorkflowStatus,
  WorkflowStepStatus,
  WorkflowStepType,
} from "@prisma/client"
import { z } from "zod"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import {
  canSubmitForDcCheck,
  isDocumentLocked,
} from "@/lib/workflow/constants"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const revisionActionSchema = z.object({
  revisionId: z.string().trim().min(1),
  comments: z.string().trim().max(1000).optional(),
})

const stepDefinitions = [
  { stepType: WorkflowStepType.Prepared, stepOrder: 1 },
  { stepType: WorkflowStepType.Reviewed, stepOrder: 2 },
  { stepType: WorkflowStepType.Approved, stepOrder: 3 },
  { stepType: WorkflowStepType.DcCheck, stepOrder: 4 },
] as const

function getProjectRoleCodes(user: CurrentAppUser, projectId: string) {
  return user.projectRoles
    .filter((item) => item.projectId === projectId)
    .map((item) => item.role.code)
}

function assertPermission(
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
    throw new Error("You do not have permission to perform this workflow action.")
  }
}

function buildRoleSnapshot(user: CurrentAppUser, projectId: string) {
  const roles = [
    ...user.userRoles.map((item) => item.role.name),
    ...user.projectRoles
      .filter((item) => item.projectId === projectId)
      .map((item) => `${item.project.code}:${item.role.name}`),
  ]

  return roles.length > 0 ? roles.join(", ") : "Unassigned"
}

function buildSignatureHash(input: {
  userId: string
  revisionId: string
  stepType: WorkflowStepType
  signedAt: Date
}) {
  return createHash("sha256")
    .update(
      `${input.userId}|${input.revisionId}|${input.stepType}|${input.signedAt.toISOString()}`
    )
    .digest("hex")
}

export async function seedWorkflowStepsForRevision(
  tx: PrismaLike,
  revisionId: string
) {
  await tx.workflowStep.createMany({
    data: stepDefinitions.map((step) => ({
      documentRevisionId: revisionId,
      stepType: step.stepType,
      stepOrder: step.stepOrder,
      status: WorkflowStepStatus.Pending,
    })),
    skipDuplicates: true,
  })
}

type PrismaLike = Pick<
  typeof prisma,
  "workflowStep" | "workflowAction" | "auditLog" | "signatureEvent"
>

async function getRevisionForAction(revisionId: string) {
  const revision = await prisma.documentRevision.findUnique({
    where: {
      id: revisionId,
    },
    include: {
      document: {
        include: {
          currentReviewCode: true,
        },
      },
      workflowSteps: {
        orderBy: [{ stepOrder: "asc" }],
      },
      files: {
        where: {
          deletedAt: null,
        },
      },
      reviewCode: true,
    },
  })

  if (!revision || revision.deletedAt) {
    throw new Error("The selected revision could not be found.")
  }

  return revision
}

async function signWorkflowStep(input: {
  revisionId: string
  stepType: WorkflowStepType
  actor: CurrentAppUser
  comments?: string
  actionType: WorkflowActionType
  fromStatus: WorkflowStatus
  toStatus: WorkflowStatus
  nextStepStatus: WorkflowStepStatus
}) {
  const signedAt = new Date()
  const signatureHash = buildSignatureHash({
    userId: input.actor.id,
    revisionId: input.revisionId,
    stepType: input.stepType,
    signedAt,
  })

  return prisma.$transaction(async (tx) => {
    const revision = await tx.documentRevision.findUnique({
      where: {
        id: input.revisionId,
      },
      include: {
        document: true,
        reviewCode: true,
        workflowSteps: true,
      },
    })

    if (!revision || revision.deletedAt) {
      throw new Error("The selected revision could not be found.")
    }

    const lockState = isDocumentLocked({
      revisionStatus: revision.revisionStatus,
      clientReplyState: revision.clientReplyState,
      reviewCodeFinalizesDocument: revision.reviewCode?.finalizesDocument ?? false,
      reviewCodeInformationalOnly:
        revision.reviewCode?.informationalOnly ?? false,
    })

    if (lockState) {
      throw new Error("This revision is locked and cannot be changed.")
    }

    if (!input.actor.signatureProfile?.signatureProviderKey) {
      throw new Error(
        "A signature image must be uploaded in the user profile before signing workflow steps."
      )
    }

    const step = revision.workflowSteps.find(
      (item) => item.stepType === input.stepType
    )

    if (!step) {
      throw new Error("The required workflow step is missing for this revision.")
    }

    const auditLog = await tx.auditLog.create({
      data: {
        action: `workflow.${input.actionType}`,
        entityType: "DocumentRevision",
        entityId: revision.id,
        projectId: revision.document.projectId,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          stepType: input.stepType,
          toStatus: input.toStatus,
          comments: input.comments ?? null,
        },
      },
    })

    const signatureEvent = await tx.signatureEvent.create({
      data: {
        userId: input.actor.id,
        signatureProfileId: input.actor.signatureProfile?.id ?? null,
        userDisplayNameSnapshot: input.actor.fullName,
        roleSnapshot: buildRoleSnapshot(input.actor, revision.document.projectId),
        targetEntityType: "DocumentRevision",
        targetEntityId: revision.id,
        workflowStepType: input.stepType,
        signatureStorageProvider:
          input.actor.signatureProfile?.signatureStorageProvider ?? null,
        signatureProviderKey:
          input.actor.signatureProfile?.signatureProviderKey ?? null,
        initialsStorageProvider:
          input.actor.signatureProfile?.initialsStorageProvider ?? null,
        initialsProviderKey:
          input.actor.signatureProfile?.initialsProviderKey ?? null,
        signedAt,
        timezone: input.actor.timezone,
        signatureHash,
        auditLogId: auditLog.id,
      },
    })

    await tx.workflowStep.update({
      where: {
        id: step.id,
      },
      data: {
        status: input.nextStepStatus,
        actedByUserId: input.actor.id,
        actedAt: signedAt,
        comments: input.comments?.trim() || null,
        signatureEventId: signatureEvent.id,
      },
    })

    await tx.documentRevision.update({
      where: {
        id: revision.id,
      },
      data: {
        workflowStatus: input.toStatus,
      },
    })

    await tx.mdrDocument.update({
      where: {
        id: revision.documentId,
      },
      data: {
        currentWorkflowStatus: input.toStatus,
      },
    })

    await tx.workflowAction.create({
      data: {
        documentRevisionId: revision.id,
        workflowStepId: step.id,
        actionType: input.actionType,
        actorUserId: input.actor.id,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        comments: input.comments?.trim() || null,
      },
    })
  })
}

export async function prepareRevision(
  actor: CurrentAppUser,
  input: unknown
) {
  const parsed = revisionActionSchema.parse(input)
  const revision = await getRevisionForAction(parsed.revisionId)
  assertPermission(actor, revision.document.projectId, "workflowPrepare")

  const hasSourceFile = revision.files.some((file) =>
    file.type === DocumentFileType.SOURCE ||
    file.type === DocumentFileType.REVISION_SOURCE
  )

  if (!hasSourceFile) {
    throw new Error(
      "At least one source file must be uploaded before the revision can be prepared."
    )
  }

  return signWorkflowStep({
    revisionId: revision.id,
    stepType: WorkflowStepType.Prepared,
    actor,
    comments: parsed.comments,
    actionType: WorkflowActionType.SubmittedForReview,
    fromStatus: revision.workflowStatus,
    toStatus: WorkflowStatus.PendingReview,
    nextStepStatus: WorkflowStepStatus.Approved,
  })
}

export async function reviewRevision(
  actor: CurrentAppUser,
  input: unknown,
  approved: boolean
) {
  const parsed = revisionActionSchema.parse(input)
  const revision = await getRevisionForAction(parsed.revisionId)
  assertPermission(actor, revision.document.projectId, "workflowReview")

  const preparedStep = revision.workflowSteps.find(
    (item) => item.stepType === WorkflowStepType.Prepared
  )

  if (preparedStep?.status !== WorkflowStepStatus.Approved) {
    throw new Error("Prepared step must be signed before review can proceed.")
  }

  return signWorkflowStep({
    revisionId: revision.id,
    stepType: WorkflowStepType.Reviewed,
    actor,
    comments: parsed.comments,
    actionType: approved
      ? WorkflowActionType.ReviewApproved
      : WorkflowActionType.ReviewRejected,
    fromStatus: revision.workflowStatus,
    toStatus: approved
      ? WorkflowStatus.PendingApproval
      : WorkflowStatus.ReviewRejected,
    nextStepStatus: approved
      ? WorkflowStepStatus.Approved
      : WorkflowStepStatus.Rejected,
  })
}

export async function approveRevision(
  actor: CurrentAppUser,
  input: unknown,
  approved: boolean
) {
  const parsed = revisionActionSchema.parse(input)
  const revision = await getRevisionForAction(parsed.revisionId)
  assertPermission(actor, revision.document.projectId, "workflowApprove")

  const preparedStep = revision.workflowSteps.find(
    (item) => item.stepType === WorkflowStepType.Prepared
  )
  const reviewedStep = revision.workflowSteps.find(
    (item) => item.stepType === WorkflowStepType.Reviewed
  )

  if (
    preparedStep?.status !== WorkflowStepStatus.Approved ||
    reviewedStep?.status !== WorkflowStepStatus.Approved
  ) {
    throw new Error("Prepared and reviewed steps must be signed first.")
  }

  return signWorkflowStep({
    revisionId: revision.id,
    stepType: WorkflowStepType.Approved,
    actor,
    comments: parsed.comments,
    actionType: approved
      ? WorkflowActionType.ApprovalApproved
      : WorkflowActionType.ApprovalRejected,
    fromStatus: revision.workflowStatus,
    toStatus: approved
      ? WorkflowStatus.ReadyForDcCheck
      : WorkflowStatus.ApprovalRejected,
    nextStepStatus: approved
      ? WorkflowStepStatus.Approved
      : WorkflowStepStatus.Rejected,
  })
}

export async function dcValidateRevision(
  actor: CurrentAppUser,
  input: unknown,
  approved: boolean
) {
  const parsed = revisionActionSchema.parse(input)
  const revision = await getRevisionForAction(parsed.revisionId)
  assertPermission(actor, revision.document.projectId, "dcCheck")

  if (!canSubmitForDcCheck(revision.workflowStatus)) {
    throw new Error("This revision is not ready for DC validation.")
  }

  return prisma.$transaction(async (tx) => {
    const step = await tx.workflowStep.findUnique({
      where: {
        documentRevisionId_stepType: {
          documentRevisionId: revision.id,
          stepType: WorkflowStepType.DcCheck,
        },
      },
    })

    if (!step) {
      throw new Error("DC check step is missing for this revision.")
    }

    const nextStatus = approved
      ? WorkflowStatus.ReadyToSubmit
      : WorkflowStatus.DcReturnedForCorrection

    await tx.workflowStep.update({
      where: {
        id: step.id,
      },
      data: {
        status: approved ? WorkflowStepStatus.Approved : WorkflowStepStatus.Rejected,
        actedByUserId: actor.id,
        actedAt: new Date(),
        comments: parsed.comments?.trim() || null,
      },
    })

    await tx.documentRevision.update({
      where: {
        id: revision.id,
      },
      data: {
        workflowStatus: nextStatus,
      },
    })

    await tx.mdrDocument.update({
      where: {
        id: revision.documentId,
      },
      data: {
        currentWorkflowStatus: nextStatus,
      },
    })

    await tx.workflowAction.create({
      data: {
        documentRevisionId: revision.id,
        workflowStepId: step.id,
        actionType: approved
          ? WorkflowActionType.DcValidated
          : WorkflowActionType.ReturnedForCorrection,
        actorUserId: actor.id,
        fromStatus: revision.workflowStatus,
        toStatus: nextStatus,
        comments: parsed.comments?.trim() || null,
      },
    })
  })
}
