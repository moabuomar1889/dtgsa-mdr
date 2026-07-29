"use server"

import { createHash } from "node:crypto"
import { revalidatePath } from "next/cache"
import { CommentState, Prisma } from "@prisma/client"
import {
  REVIEW_SESSION_TTL_MS,
  assertCommentTransition,
  assertReviewSession,
  clampActiveSeconds,
  validateCommentLocation,
  validateReturnRequest,
} from "@dtg/review-domain"
import { prisma } from "../server/database"
import { requireApprovalActor } from "../server/auth"

export async function openReviewAction(stepInstanceId: string) {
  const actor = await requireApprovalActor()
  const step = await prisma.workflowStepInstance.findUnique({
    where: { id: stepInstanceId },
  })
  if (!step || step.status !== "Active") throw new Error("Step is not active.")
  const [assignment, cycle] = await Promise.all([
    prisma.workflowAssignment.findFirst({
      where: {
        stepInstanceId,
        assigneeId: actor.id,
        reassignmentRequiredAt: null,
      },
    }),
    prisma.approvalCycle.findUnique({ where: { id: step.approvalCycleId } }),
  ])
  if (!assignment || !cycle?.isActive) {
    throw new Error("The approval case is not assigned and active.")
  }
  const now = new Date()
  await prisma.reviewSession.updateMany({
    where: {
      stepInstanceId,
      userId: actor.id,
      revokedAt: null,
      OR: [
        { packageHash: { not: cycle.contentHash } },
        { expiresAt: { lte: now } },
      ],
    },
    data: { revokedAt: now },
  })
  const existing = await prisma.reviewSession.findFirst({
    where: {
      stepInstanceId,
      userId: actor.id,
      packageHash: cycle.contentHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { startedAt: "desc" },
  })
  if (existing) return
  const review = await prisma.reviewSession.create({
    data: {
      stepInstanceId,
      userId: actor.id,
      contentHash: cycle.contentHash,
      packageHash: cycle.contentHash,
      firstOpenedAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + REVIEW_SESSION_TTL_MS),
    },
  })
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "approval.review.opened",
      entityType: "ReviewSession",
      entityId: review.id,
      afterSnapshot: { stepInstanceId, packageHash: cycle.contentHash },
    },
  })
  revalidatePath("/")
  return
}

export async function recordPageEventAction(input: {
  reviewSessionId: string
  pageNumber: number
  activeSeconds: number
}) {
  const actor = await requireApprovalActor()
  const session = await prisma.reviewSession.findUnique({
    where: { id: input.reviewSessionId },
  })
  if (!session || session.userId !== actor.id || session.revokedAt) {
    throw new Error("Review session is unavailable.")
  }
  const activeSeconds = clampActiveSeconds(input.activeSeconds)
  const now = new Date()
  await prisma.$transaction([
    prisma.reviewPageEvent.create({
      data: {
        reviewSessionId: session.id,
        pageNumber: input.pageNumber,
        eventType: "PAGE_RENDERED",
        activeSeconds,
      },
    }),
    prisma.reviewSession.update({
      where: { id: session.id },
      data: {
        lastActivityAt: now,
        approximateActiveSeconds: { increment: activeSeconds },
      },
    }),
  ])
  revalidatePath("/")
}

export async function completeReviewAction(reviewSessionId: string) {
  const actor = await requireApprovalActor()
  const session = await prisma.reviewSession.findUnique({
    where: { id: reviewSessionId },
    include: { pageEvents: { take: 1 } },
  })
  if (
    !session ||
    session.userId !== actor.id ||
    session.revokedAt ||
    !session.expiresAt ||
    session.expiresAt <= new Date()
  ) {
    throw new Error("Review session is unavailable or expired.")
  }
  if (session.pageEvents.length === 0) {
    throw new Error("Render the controlled package before completing review.")
  }
  const now = new Date()
  await prisma.reviewSession.update({
    where: { id: session.id },
    data: {
      completedAt: now,
      declarationAcceptedAt: now,
      lastActivityAt: now,
    },
  })
  revalidatePath("/")
}

export async function createCommentAction(formData: FormData) {
  const actor = await requireApprovalActor()
  const revisionId = String(formData.get("revisionId") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  if (!body || body.length > 5000) throw new Error("Comment body is required.")
  const pageNumber = Number(formData.get("pageNumber") || 0)
  const locationType = String(formData.get("locationType") || "GENERAL") as
    | "GENERAL"
    | "PAGE"
    | "AREA"
    | "TEXT"
  const location = validateCommentLocation({
    type: locationType,
    pageNumber: pageNumber || undefined,
    x: Number(formData.get("x") || 0),
    y: Number(formData.get("y") || 0),
    width: Number(formData.get("width") || 0),
    height: Number(formData.get("height") || 0),
    selectedText: String(formData.get("selectedText") ?? "") || undefined,
  })
  const revision = await prisma.documentRevision.findUnique({
    where: { id: revisionId },
    include: { document: true },
  })
  if (
    !revision ||
    (!actor.systemRoles.some((role) =>
      ["super_admin", "system_admin", "document_control_admin"].includes(role)
    ) &&
      !actor.projectRoles.some(
        (role) => role.projectId === revision.document.projectId
      ))
  ) {
    throw new Error("Cross-project comment access is denied.")
  }
  const comment = await prisma.comment.create({
    data: {
      revisionId,
      authorUserId: actor.id,
      body,
      category: String(formData.get("category") ?? "") || null,
      blocking: formData.get("blocking") === "on",
      dueAt: formData.get("dueAt")
        ? new Date(String(formData.get("dueAt")))
        : null,
      responsibleDepartmentId:
        String(formData.get("responsibleDepartmentId") ?? "") || null,
    },
  })
  await prisma.commentLocation.create({
    data: {
      commentId: comment.id,
      locationType: location.type,
      pageNumber: location.pageNumber,
      coordinates:
        location.type === "AREA"
          ? {
              x: location.x,
              y: location.y,
              width: location.width,
              height: location.height,
            }
          : undefined,
      selectedText: location.selectedText,
    },
  })
  revalidatePath("/")
}

export async function transitionCommentAction(input: {
  commentId: string
  to: CommentState
}) {
  const actor = await requireApprovalActor()
  const comment = await prisma.comment.findUnique({
    where: { id: input.commentId },
  })
  if (!comment) throw new Error("Comment was not found.")
  const assignments = await prisma.commentAssignment.findMany({
    where: { commentId: comment.id },
  })
  assertCommentTransition({
    from: comment.state,
    to: input.to,
    blocking: comment.blocking,
    actorUserId: actor.id,
    authorUserId: comment.authorUserId ?? "",
    assigneeIds: assignments
      .filter((item) => item.assigneeType === "PERSON")
      .map((item) => item.assigneeId),
  })
  const now = new Date()
  await prisma.$transaction([
    prisma.comment.update({
      where: { id: comment.id },
      data: {
        state: input.to,
        resolvedAt: input.to === "Resolved" ? now : undefined,
        closureVerifiedByUserId: input.to === "Verified" ? actor.id : undefined,
        closedAt: input.to === "Closed" ? now : undefined,
        reopenedAt: input.to === "Reopened" ? now : undefined,
      },
    }),
    prisma.commentStatusEvent.create({
      data: {
        commentId: comment.id,
        fromState: comment.state,
        toState: input.to,
        actorUserId: actor.id,
      },
    }),
  ])
  revalidatePath("/")
}

const allowedDecisions = new Set([
  "APPROVE",
  "APPROVE_WITH_COMMENT",
  "REQUEST_CLARIFICATION",
  "RETURN",
  "REJECT",
  "DC_VALIDATE",
  "DC_RETURN",
])

export async function submitDecisionAction(formData: FormData) {
  const actor = await requireApprovalActor()
  const stepInstanceId = String(formData.get("stepInstanceId") ?? "")
  const reviewSessionId = String(formData.get("reviewSessionId") ?? "")
  const decision = String(formData.get("decision") ?? "")
  const comments = String(formData.get("comments") ?? "").trim()
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "")
  const declarationAccepted = formData.get("declaration") === "on"
  if (!allowedDecisions.has(decision)) throw new Error("Decision is invalid.")
  if (!idempotencyKey || !declarationAccepted) {
    throw new Error(
      "Idempotency key and responsibility declaration are required."
    )
  }
  const existing = await prisma.approvalDecision.findUnique({
    where: { idempotencyKey },
  })
  if (existing) return

  await prisma.$transaction(
    async (tx) => {
      const step = await tx.workflowStepInstance.findUnique({
        where: { id: stepInstanceId },
      })
      if (!step || step.status !== "Active")
        throw new Error("Step is not active.")
      const cycle = await tx.approvalCycle.findUnique({
        where: { id: step.approvalCycleId },
        include: { snapshot: true, revision: { include: { document: true } } },
      })
      if (!cycle?.isActive) throw new Error("Approval cycle is not active.")
      const [assignment, review, recentAuth, blockingCount] = await Promise.all(
        [
          tx.workflowAssignment.findFirst({
            where: {
              stepInstanceId,
              assigneeId: actor.id,
              reassignmentRequiredAt: null,
            },
          }),
          tx.reviewSession.findUnique({ where: { id: reviewSessionId } }),
          tx.recentAuthenticationEvidence.findFirst({
            where: {
              userId: actor.id,
              internalSessionId: actor.sessionId,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
            orderBy: { authenticatedAt: "desc" },
          }),
          tx.comment.count({
            where: {
              revisionId: cycle.revisionId,
              blocking: true,
              state: { in: [CommentState.Open, CommentState.Reopened] },
            },
          }),
        ]
      )
      if (!assignment || !review || !recentAuth) {
        throw new Error(
          "Assignment, review, and recent authentication are required."
        )
      }
      assertReviewSession(
        {
          userId: review.userId,
          packageHash: review.packageHash ?? review.contentHash,
          completedAt: review.completedAt,
          expiresAt: review.expiresAt!,
          revokedAt: review.revokedAt,
          declarationAcceptedAt: review.declarationAcceptedAt,
        },
        { actorUserId: actor.id, currentPackageHash: cycle.contentHash }
      )
      if (
        ["APPROVE", "APPROVE_WITH_COMMENT", "DC_VALIDATE"].includes(decision) &&
        blockingCount > 0
      ) {
        throw new Error("Unresolved blocking comments prevent approval.")
      }
      if (["RETURN", "DC_RETURN"].includes(decision)) {
        const blockingCommentIds = String(
          formData.get("blockingCommentIds") ?? ""
        )
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
        const validBlockingComments = await tx.comment.count({
          where: {
            id: { in: blockingCommentIds },
            revisionId: cycle.revisionId,
            blocking: true,
            state: { in: [CommentState.Open, CommentState.Reopened] },
          },
        })
        if (validBlockingComments !== new Set(blockingCommentIds).size) {
          throw new Error("Return references invalid or non-blocking comments.")
        }
        validateReturnRequest({
          reason: comments,
          responsibleDepartment: String(
            formData.get("responsibleDepartment") ?? ""
          ),
          blockingCommentIds,
          dueAt: formData.get("dueAt")
            ? new Date(String(formData.get("dueAt")))
            : undefined,
          confirmed: formData.get("returnConfirmed") === "on",
        })
      }
      if (decision === "DC_VALIDATE" && !step.stepKey.includes("dc")) {
        throw new Error("Only the DC Validator step may validate.")
      }
      const claim = await tx.workflowStepInstance.updateMany({
        where: {
          id: step.id,
          status: "Active",
          expectedStateVersion: step.expectedStateVersion,
        },
        data: {
          status: ["APPROVE", "APPROVE_WITH_COMMENT", "DC_VALIDATE"].includes(
            decision
          )
            ? "Completed"
            : "Closed",
          expectedStateVersion: { increment: 1 },
          completedAt: new Date(),
        },
      })
      if (claim.count !== 1) throw new Error("Concurrent decision conflict.")
      const resultHash = createHash("sha256")
        .update(
          JSON.stringify({
            stepInstanceId,
            actorUserId: actor.id,
            decision,
            packageHash: cycle.contentHash,
          })
        )
        .digest("hex")
      const approvalDecision = await tx.approvalDecision.create({
        data: {
          stepInstanceId,
          actorUserId: actor.id,
          decision,
          expectedStateVersion: step.expectedStateVersion,
          idempotencyKey,
          comments: comments || null,
          resultHash,
        },
      })
      const appearance = await tx.employeeSignatureAppearanceVersion.findFirst({
        where: {
          userId: actor.id,
          publishedAt: { not: null },
          retiredAt: null,
        },
        orderBy: { version: "desc" },
      })
      const evidenceHash = createHash("sha256")
        .update(`${resultHash}:${review.id}:${recentAuth.id}`)
        .digest("hex")
      const evidence = await tx.approvalEvidence.create({
        data: {
          approvalDecisionId: approvalDecision.id,
          reviewSessionId: review.id,
          stepInstanceId,
          identitySnapshot: {
            employeeCode: actor.employeeCode,
            name: actor.fullName,
            email: actor.email,
            jobTitle: actor.jobTitle,
            googleSubject: actor.googleSubject,
          },
          roleSnapshot: assignment.snapshot as Prisma.InputJsonValue,
          declaration: "approval-responsibility-v1",
          declarationHash: createHash("sha256")
            .update("approval-responsibility-v1")
            .digest("hex"),
          contentHash: evidenceHash,
          packageHash: cycle.contentHash,
          googleSubjectId: actor.googleSubject,
          employeeSnapshot: {
            name: actor.fullName,
            jobTitle: actor.jobTitle,
            employeeCode: actor.employeeCode,
          },
          workflowSnapshot: {
            id: cycle.snapshotId,
            digest: cycle.snapshot.snapshotHash,
          },
          approvalCycleId: cycle.id,
          decision,
          recentAuthEvidenceId: recentAuth.id,
          requestMetadata: { sessionHash: actor.sessionHash },
          signatureAppearanceVersionId: appearance?.id,
        },
      })
      await tx.approvalDecision.update({
        where: { id: approvalDecision.id },
        data: { approvalEvidenceId: evidence.id },
      })
      const successful = [
        "APPROVE",
        "APPROVE_WITH_COMMENT",
        "DC_VALIDATE",
      ].includes(decision)
      if (successful) {
        const next = await tx.workflowStepInstance.findFirst({
          where: {
            approvalCycleId: cycle.id,
            status: "Pending",
            stepOrder: { gt: step.stepOrder },
          },
          orderBy: { stepOrder: "asc" },
        })
        if (next) {
          await tx.workflowStepInstance.update({
            where: { id: next.id },
            data: { status: "Active", startedAt: new Date() },
          })
        } else {
          await tx.approvalCycle.update({
            where: { id: cycle.id },
            data: {
              status: "Completed",
              isActive: false,
              completedAt: new Date(),
            },
          })
        }
      } else {
        await tx.approvalCycle.update({
          where: { id: cycle.id },
          data: {
            status: decision === "REJECT" ? "Rejected" : "Returned",
            isActive: false,
            completedAt: new Date(),
          },
        })
      }
      await tx.outboxEvent.create({
        data: {
          eventType: "DECISION_RECORDED",
          aggregateType: "ApprovalCycle",
          aggregateId: cycle.id,
          payload: { decisionId: approvalDecision.id, decision },
        },
      })
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: "approval.decision.recorded",
          entityType: "ApprovalDecision",
          entityId: approvalDecision.id,
          projectId: cycle.revision.document.projectId,
          afterSnapshot: {
            decision,
            packageHash: cycle.contentHash,
            evidenceId: evidence.id,
          },
        },
      })
      return
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
  revalidatePath("/")
}
