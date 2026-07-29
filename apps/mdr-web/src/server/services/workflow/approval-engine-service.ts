import "server-only"
import { createHash } from "node:crypto"
import { FoundationRecordStatus, IntegrityStatus, Prisma } from "@prisma/client"
import {
  canonicalize,
  createApprovalEvidence,
  type JsonValue,
} from "@dtg/trust-domain"
import {
  assertReviewEligibility,
  evaluateSeparation,
  nextEligibleSteps,
  validateAssignments,
  validateDefinition,
  workflowDigest,
  type ResolvedAssignment,
  type WorkflowDefinitionPolicy,
} from "@dtg/workflow-engine-domain"
import { prisma } from "@/lib/prisma/client"

const DECISIONS = new Set([
  "APPROVE",
  "APPROVE_WITH_COMMENT",
  "REQUEST_CLARIFICATION",
  "RETURN",
  "REJECT",
  "DC_VALIDATE",
  "DC_RETURN",
  "CANCEL",
])

function hash(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex")
}

function definitionFromRows(
  kind: string,
  steps: Array<{
    stepKey: string
    stepOrder: number
    label: string | null
    required: boolean
    quorum: number
    parallelGroupId: string | null
    assignmentType: string
    assignmentValue: string | null
    allowAssigneePool: boolean
    fallbackAssignment: Prisma.JsonValue | null
    reviewRequired: boolean
    commentRequired: boolean
    dcValidation: boolean
    returnTargets: Prisma.JsonValue | null
  }>
): WorkflowDefinitionPolicy {
  return {
    kind,
    dcRequired: steps.some((step) => step.dcValidation && step.required),
    steps: steps.map((step) => ({
      key: step.stepKey,
      order: step.stepOrder,
      label: step.label ?? step.stepKey,
      required: step.required,
      parallelGroup: step.parallelGroupId ?? undefined,
      quorum: step.quorum,
      assignment: {
        strategy:
          step.assignmentType as WorkflowDefinitionPolicy["steps"][number]["assignment"]["strategy"],
        value: step.assignmentValue ?? "",
        fallback:
          typeof step.fallbackAssignment === "string"
            ? step.fallbackAssignment
            : undefined,
        allowPool: step.allowAssigneePool,
      },
      reviewRequired: step.reviewRequired,
      commentRequired: step.commentRequired,
      dcValidation: step.dcValidation,
      returnTargets: Array.isArray(step.returnTargets)
        ? step.returnTargets.filter(
            (value): value is string => typeof value === "string"
          )
        : [],
    })),
  }
}

export async function createWorkflowDraft(input: {
  definitionCode: string
  definitionName: string
  description?: string
  policy: WorkflowDefinitionPolicy
}) {
  const policy = validateDefinition(input.policy)
  return prisma.$transaction(async (tx) => {
    const definition = await tx.workflowDefinition.upsert({
      where: { code: input.definitionCode },
      create: {
        code: input.definitionCode,
        name: input.definitionName,
        description: input.description,
      },
      update: {},
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    })
    const versionNumber = (definition.versions[0]?.version ?? 0) + 1
    return tx.workflowDefinitionVersion.create({
      data: {
        definitionId: definition.id,
        version: versionNumber,
        policyDigest: workflowDigest(policy),
        steps: {
          create: policy.steps.map((step) => ({
            stepKey: step.key,
            stepOrder: step.order,
            label: step.label,
            required: step.required,
            quorum: step.quorum,
            parallelGroupId: step.parallelGroup,
            assignmentType: step.assignment.strategy,
            assignmentValue: step.assignment.value,
            allowAssigneePool: step.assignment.allowPool ?? false,
            fallbackAssignment: step.assignment.fallback,
            reviewRequired: step.reviewRequired,
            commentRequired: step.commentRequired,
            dcValidation: step.dcValidation,
            returnTargets: step.returnTargets,
          })),
        },
      },
      include: { steps: true },
    })
  })
}

export async function publishWorkflowVersion(versionId: string) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.workflowDefinitionVersion.findUnique({
      where: { id: versionId },
      include: { definition: true, steps: true },
    })
    if (!version || version.status !== FoundationRecordStatus.Draft) {
      throw new Error("Only a draft workflow version can be published.")
    }
    const policy = definitionFromRows(version.definition.code, version.steps)
    validateDefinition(policy)
    await tx.workflowDefinitionVersion.updateMany({
      where: {
        definitionId: version.definitionId,
        status: FoundationRecordStatus.Published,
      },
      data: {
        status: FoundationRecordStatus.Superseded,
        supersededAt: new Date(),
      },
    })
    return tx.workflowDefinitionVersion.update({
      where: { id: version.id },
      data: {
        status: FoundationRecordStatus.Published,
        publishedAt: new Date(),
        policyDigest: workflowDigest(policy),
      },
    })
  })
}

export async function startApprovalCycle(input: {
  revisionId: string
  definitionVersionId: string
  packageHash: string
  assignments: ResolvedAssignment[]
  approvedOverrideRequestId?: string
}) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.workflowDefinitionVersion.findUnique({
      where: { id: input.definitionVersionId },
      include: { definition: true, steps: { orderBy: { stepOrder: "asc" } } },
    })
    if (!version || version.status !== FoundationRecordStatus.Published) {
      throw new Error("A published workflow definition is required.")
    }
    const revision = await tx.documentRevision.findUnique({
      where: { id: input.revisionId },
      include: {
        packageManifests: { include: { hashes: true } },
        controlledMainFiles: true,
        approvalCycles: { orderBy: { cycleNumber: "desc" }, take: 1 },
      },
    })
    if (!revision) throw new Error("Document revision was not found.")
    const packageExists = revision.packageManifests.some((manifest) =>
      manifest.hashes.some((item) => item.value === input.packageHash)
    )
    if (!packageExists) {
      throw new Error("Package Hash does not belong to this revision.")
    }
    if (
      !revision.controlledMainFiles.some(
        (file) =>
          file.isActive && file.integrityStatus === IntegrityStatus.Verified
      )
    ) {
      throw new Error("A verified controlled Main File is required.")
    }
    const policy = definitionFromRows(version.definition.code, version.steps)
    validateAssignments(policy, input.assignments)
    const separation = evaluateSeparation(input.assignments)
    if (!separation.valid) {
      if (!input.approvedOverrideRequestId) {
        throw new Error("Separation of duties conflict.")
      }
      const override = await tx.emergencyOverrideRequest.findUnique({
        where: { id: input.approvedOverrideRequestId },
      })
      if (
        !override ||
        override.status !== "Approved" ||
        override.expiresAt <= new Date()
      ) {
        throw new Error("A valid independently approved override is required.")
      }
      const independentApproval = await tx.emergencyOverrideApproval.findFirst({
        where: {
          requestId: override.id,
          approverUserId: { not: override.requesterUserId },
          decision: "Approved",
        },
      })
      if (!independentApproval) {
        throw new Error(
          "Emergency override requires independent admin approval."
        )
      }
    }

    await tx.approvalCycle.updateMany({
      where: { revisionId: revision.id, isActive: true },
      data: {
        isActive: false,
        status: "Invalidated",
        invalidatedAt: new Date(),
        invalidationReason: "NEW_PACKAGE_OR_CYCLE",
      },
    })
    const snapshotContent = {
      definitionId: version.definitionId,
      definitionVersionId: version.id,
      definitionVersion: version.version,
      policy,
      assignments: input.assignments
        .map((assignment) => ({
          stepKey: assignment.stepKey,
          userIds: [...assignment.userIds].sort(),
        }))
        .sort((a, b) => a.stepKey.localeCompare(b.stepKey)),
      packageHash: input.packageHash,
      revisionId: revision.id,
    }
    const persistedSnapshotContent = JSON.parse(
      JSON.stringify(snapshotContent)
    ) as JsonValue
    const snapshotHash = hash(canonicalize(persistedSnapshotContent))
    const snapshot = await tx.workflowSnapshot.create({
      data: {
        definitionVersionId: version.id,
        snapshotHash,
        packageHash: input.packageHash,
        content: persistedSnapshotContent as Prisma.InputJsonValue,
        steps: {
          create: policy.steps.map((step) => ({
            stepKey: step.key,
            stepOrder: step.order,
            assignmentSnapshot: input.assignments.find(
              (item) => item.stepKey === step.key
            ) ?? {
              stepKey: step.key,
              userIds: [],
            },
            required: step.required,
            quorum: step.quorum,
            parallelGroupId: step.parallelGroup,
            policySnapshot: step,
          })),
        },
      },
    })
    const cycle = await tx.approvalCycle.create({
      data: {
        revisionId: revision.id,
        snapshotId: snapshot.id,
        cycleNumber: (revision.approvalCycles[0]?.cycleNumber ?? 0) + 1,
        contentHash: input.packageHash,
      },
    })
    for (const step of policy.steps) {
      const assignees =
        input.assignments.find((item) => item.stepKey === step.key)?.userIds ??
        []
      const instance = await tx.workflowStepInstance.create({
        data: {
          approvalCycleId: cycle.id,
          stepKey: step.key,
          stepOrder: step.order,
          parallelGroupId: step.parallelGroup,
          required: step.required,
          quorum: step.quorum,
          policySnapshot: step,
          status:
            !step.required && assignees.length === 0 ? "Skipped" : "Pending",
        },
      })
      for (const userId of assignees) {
        await tx.workflowAssignment.create({
          data: {
            stepInstanceId: instance.id,
            assigneeType: "USER",
            assigneeId: userId,
            snapshot: { userId, resolvedFrom: step.assignment },
          },
        })
        await tx.outboxEvent.create({
          data: {
            eventType: "STEP_ASSIGNED",
            aggregateType: "WorkflowStepInstance",
            aggregateId: instance.id,
            payload: { cycleId: cycle.id, stepKey: step.key, userId },
          },
        })
      }
    }
    const createdSteps = await tx.workflowStepInstance.findMany({
      where: { approvalCycleId: cycle.id },
    })
    const initiallyEligible = nextEligibleSteps({
      steps: createdSteps.map((item) => ({
        key: item.stepKey,
        order: item.stepOrder,
        parallelGroup: item.parallelGroupId,
        required: item.required,
        status: item.status,
      })),
    })
    await tx.workflowStepInstance.updateMany({
      where: {
        approvalCycleId: cycle.id,
        stepKey: { in: initiallyEligible.map((item) => item.key) },
      },
      data: { status: "Active", startedAt: new Date() },
    })
    await tx.separationOfDutiesEvaluation.create({
      data: {
        approvalCycleId: cycle.id,
        result: separation.valid ? "Passed" : "OverrideApproved",
        evaluatedAssignments: input.assignments,
        overrideRequestId: input.approvedOverrideRequestId,
      },
    })
    for (const eventType of [
      "CASE_CREATED",
      "CYCLE_STARTED",
      "STEP_ACTIVATED",
    ]) {
      await tx.outboxEvent.create({
        data: {
          eventType,
          aggregateType: "ApprovalCycle",
          aggregateId: cycle.id,
          payload: { revisionId: revision.id, packageHash: input.packageHash },
        },
      })
    }
    return cycle
  })
}

type DecisionEvidenceContext = {
  googleSubjectId: string
  employeeId: string
  employeeName: string
  roleSnapshot: JsonValue
  departmentOrProjectRole: string
  documentNumber: string
  revision: string
  mainFileSha256: string
  workflowSnapshotDigest: string
  declarationVersion: string
  declarationTextHash: string
  commentReferences: string[]
  recentAuthEvidenceId: string
  sessionHash: string
  ipHash: string
  userAgentHash: string
  signatureAppearanceVersionId: string
}

export async function recordWorkflowDecision(input: {
  stepInstanceId: string
  actorUserId: string
  decision: string
  expectedStateVersion: number
  idempotencyKey: string
  reviewSessionId: string
  comments?: string
  returnTarget?: string
  responsibleDepartment?: string
  evidence: DecisionEvidenceContext
}) {
  if (!DECISIONS.has(input.decision)) throw new Error("Unsupported decision.")
  const existing = await prisma.approvalDecision.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  })
  if (existing) return existing

  try {
    return await prisma.$transaction(
      async (tx) => {
        const step = await tx.workflowStepInstance.findUnique({
          where: { id: input.stepInstanceId },
        })
        if (!step || step.status !== "Active") {
          throw new Error("Workflow step is not active.")
        }
        const cycle = await tx.approvalCycle.findUnique({
          where: { id: step.approvalCycleId },
          include: {
            snapshot: true,
            revision: { include: { controlledMainFiles: true } },
          },
        })
        if (!cycle || !cycle.isActive || cycle.status !== "Active") {
          throw new Error("Approval cycle is not active.")
        }
        const assignment = await tx.workflowAssignment.findFirst({
          where: {
            stepInstanceId: step.id,
            assigneeId: input.actorUserId,
            reassignmentRequiredAt: null,
          },
        })
        if (!assignment) throw new Error("Actor is not assigned to this step.")
        const review = await tx.reviewSession.findUnique({
          where: { id: input.reviewSessionId },
        })
        const recentAuth = await tx.recentAuthenticationEvidence.findUnique({
          where: { id: input.evidence.recentAuthEvidenceId },
        })
        if (!review || !review.expiresAt || !recentAuth) {
          throw new Error("Review and recent-auth evidence are required.")
        }
        assertReviewEligibility({
          reviewUserId: review.userId,
          actorUserId: input.actorUserId,
          reviewPackageHash: review.packageHash ?? review.contentHash,
          currentPackageHash: cycle.contentHash,
          reviewCompletedAt: review.completedAt,
          reviewExpiresAt: review.expiresAt,
          recentAuthExpiresAt: recentAuth.expiresAt,
          declarationAccepted: Boolean(review.declarationAcceptedAt),
        })
        const policy = step.policySnapshot as {
          commentRequired?: boolean
          dcValidation?: boolean
          returnTargets?: string[]
        } | null
        if (policy?.commentRequired && !input.comments?.trim()) {
          throw new Error("A comment is required for this step.")
        }
        if (
          ["RETURN", "DC_RETURN", "REQUEST_CLARIFICATION"].includes(
            input.decision
          ) &&
          (!input.comments?.trim() || !input.responsibleDepartment)
        ) {
          throw new Error(
            "Return reason and responsible department are required."
          )
        }
        if (
          input.returnTarget &&
          !policy?.returnTargets?.includes(input.returnTarget)
        ) {
          throw new Error("Return target is not allowed by step policy.")
        }
        if (input.decision === "DC_VALIDATE" && !policy?.dcValidation) {
          throw new Error("Only a DC Validator step may DC validate.")
        }

        const claimed = await tx.workflowStepInstance.updateMany({
          where: {
            id: step.id,
            status: "Active",
            expectedStateVersion: input.expectedStateVersion,
          },
          data: {
            status: ["APPROVE", "APPROVE_WITH_COMMENT", "DC_VALIDATE"].includes(
              input.decision
            )
              ? "Completed"
              : "Closed",
            expectedStateVersion: { increment: 1 },
            completedAt: new Date(),
          },
        })
        if (claimed.count !== 1) {
          throw new Error("Workflow decision state conflict.")
        }
        const resultHash = hash(
          canonicalize({
            stepInstanceId: step.id,
            actorUserId: input.actorUserId,
            decision: input.decision,
            expectedStateVersion: input.expectedStateVersion,
            packageHash: cycle.contentHash,
          })
        )
        const decision = await tx.approvalDecision.create({
          data: {
            stepInstanceId: step.id,
            actorUserId: input.actorUserId,
            decision: input.decision,
            expectedStateVersion: input.expectedStateVersion,
            idempotencyKey: input.idempotencyKey,
            comments: input.comments,
            resultHash,
          },
        })
        const evidencePayload = createApprovalEvidence({
          googleSubjectId: input.evidence.googleSubjectId,
          employee: {
            id: input.evidence.employeeId,
            name: input.evidence.employeeName,
          },
          roleSnapshot: input.evidence.roleSnapshot,
          departmentOrProjectRole: input.evidence.departmentOrProjectRole,
          documentNumber: input.evidence.documentNumber,
          revision: input.evidence.revision,
          mainFileSha256: input.evidence.mainFileSha256,
          packageHash: cycle.contentHash,
          workflowSnapshot: {
            id: cycle.snapshotId,
            digest: input.evidence.workflowSnapshotDigest,
          },
          approvalCycleId: cycle.id,
          stepInstanceId: step.id,
          reviewSessionId: review.id,
          decision: input.decision,
          declaration: {
            version: input.evidence.declarationVersion,
            textHash: input.evidence.declarationTextHash,
          },
          commentReferences: input.evidence.commentReferences,
          recentAuthEvidenceId: recentAuth.id,
          decidedAt: decision.decidedAt.toISOString(),
          request: {
            sessionHash: input.evidence.sessionHash,
            ipHash: input.evidence.ipHash,
            userAgentHash: input.evidence.userAgentHash,
          },
          signatureAppearanceVersionId:
            input.evidence.signatureAppearanceVersionId,
        })
        const evidence = await tx.approvalEvidence.create({
          data: {
            approvalDecisionId: decision.id,
            reviewSessionId: review.id,
            stepInstanceId: step.id,
            identitySnapshot: {
              googleSubjectId: input.evidence.googleSubjectId,
              employeeId: input.evidence.employeeId,
              employeeName: input.evidence.employeeName,
            },
            roleSnapshot: input.evidence.roleSnapshot as Prisma.InputJsonValue,
            declaration: input.evidence.declarationVersion,
            contentHash: evidencePayload.contentHash,
            packageHash: cycle.contentHash,
            canonicalPayload: Uint8Array.from(evidencePayload.canonicalBytes),
            googleSubjectId: input.evidence.googleSubjectId,
            employeeSnapshot: {
              id: input.evidence.employeeId,
              name: input.evidence.employeeName,
            },
            workflowSnapshot: {
              id: cycle.snapshotId,
              digest: input.evidence.workflowSnapshotDigest,
            },
            approvalCycleId: cycle.id,
            decision: input.decision,
            declarationHash: input.evidence.declarationTextHash,
            recentAuthEvidenceId: recentAuth.id,
            requestMetadata: {
              sessionHash: input.evidence.sessionHash,
              ipHash: input.evidence.ipHash,
              userAgentHash: input.evidence.userAgentHash,
            },
            signatureAppearanceVersionId:
              input.evidence.signatureAppearanceVersionId,
          },
        })
        await tx.approvalDecision.update({
          where: { id: decision.id },
          data: { approvalEvidenceId: evidence.id },
        })

        const successful = [
          "APPROVE",
          "APPROVE_WITH_COMMENT",
          "DC_VALIDATE",
        ].includes(input.decision)
        if (successful) {
          let steps = await tx.workflowStepInstance.findMany({
            where: { approvalCycleId: cycle.id },
          })
          let stageComplete = !steps.some((item) => item.status === "Active")
          if (step.parallelGroupId) {
            const group = steps.filter(
              (item) => item.parallelGroupId === step.parallelGroupId
            )
            const completedCount = group.filter(
              (item) => item.status === "Completed"
            ).length
            const groupQuorum = Math.max(...group.map((item) => item.quorum))
            stageComplete = completedCount >= groupQuorum
            if (stageComplete) {
              await tx.workflowStepInstance.updateMany({
                where: {
                  approvalCycleId: cycle.id,
                  parallelGroupId: step.parallelGroupId,
                  status: { in: ["Active", "Pending"] },
                },
                data: { status: "Skipped", completedAt: new Date() },
              })
              steps = await tx.workflowStepInstance.findMany({
                where: { approvalCycleId: cycle.id },
              })
            }
          }
          const eligibleKeys = new Set(
            stageComplete
              ? nextEligibleSteps({
                  steps: steps.map((item) => ({
                    key: item.stepKey,
                    order: item.stepOrder,
                    parallelGroup: item.parallelGroupId,
                    required: item.required,
                    status: item.status,
                  })),
                }).map((item) => item.key)
              : []
          )
          if (stageComplete && eligibleKeys.size === 0) {
            await tx.approvalCycle.update({
              where: { id: cycle.id },
              data: {
                status: "Completed",
                isActive: false,
                completedAt: new Date(),
              },
            })
            await tx.outboxEvent.create({
              data: {
                eventType: "CASE_COMPLETED",
                aggregateType: "ApprovalCycle",
                aggregateId: cycle.id,
                payload: { decisionId: decision.id },
              },
            })
          } else if (eligibleKeys.size > 0) {
            await tx.workflowStepInstance.updateMany({
              where: {
                id: {
                  in: steps
                    .filter((item) => eligibleKeys.has(item.stepKey))
                    .map((item) => item.id),
                },
              },
              data: { status: "Active", startedAt: new Date() },
            })
            if (eligibleKeys.size > 0) {
              await tx.outboxEvent.create({
                data: {
                  eventType: "STEP_ACTIVATED",
                  aggregateType: "ApprovalCycle",
                  aggregateId: cycle.id,
                  payload: { stepKeys: [...eligibleKeys] },
                },
              })
            }
          }
        } else {
          await tx.approvalCycle.update({
            where: { id: cycle.id },
            data: {
              status: input.decision === "REJECT" ? "Rejected" : "Returned",
              isActive: false,
              completedAt: new Date(),
            },
          })
          await tx.outboxEvent.create({
            data: {
              eventType:
                input.decision === "REJECT" ? "CASE_REJECTED" : "CASE_RETURNED",
              aggregateType: "ApprovalCycle",
              aggregateId: cycle.id,
              payload: {
                decisionId: decision.id,
                returnTarget: input.returnTarget ?? null,
                responsibleDepartment: input.responsibleDepartment ?? null,
              },
            },
          })
        }
        await tx.outboxEvent.create({
          data: {
            eventType: "STEP_COMPLETED",
            aggregateType: "WorkflowStepInstance",
            aggregateId: step.id,
            payload: { cycleId: cycle.id, decisionId: decision.id },
          },
        })
        await tx.outboxEvent.create({
          data: {
            eventType: "DECISION_RECORDED",
            aggregateType: "ApprovalCycle",
            aggregateId: cycle.id,
            payload: {
              decisionId: decision.id,
              stepInstanceId: step.id,
              decision: input.decision,
            },
          },
        })
        return { ...decision, approvalEvidenceId: evidence.id }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const duplicate = await prisma.approvalDecision.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        })
        if (duplicate) return duplicate
        await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)))
      }
    }
    throw error
  }
}

export async function requestSeparationOverride(input: {
  requesterUserId: string
  scope: string
  reason: string
  expiresAt: Date
}) {
  if (!input.reason.trim()) throw new Error("Override reason is required.")
  if (input.expiresAt <= new Date()) {
    throw new Error("Override expiry must be in the future.")
  }
  return prisma.$transaction(async (tx) => {
    const request = await tx.emergencyOverrideRequest.create({
      data: {
        requesterUserId: input.requesterUserId,
        scope: input.scope,
        reason: input.reason.trim(),
        expiresAt: input.expiresAt,
      },
    })
    await tx.outboxEvent.create({
      data: {
        eventType: "OVERRIDE_REQUESTED",
        aggregateType: "EmergencyOverrideRequest",
        aggregateId: request.id,
        payload: { scope: request.scope, expiresAt: request.expiresAt },
      },
    })
    return request
  })
}

export async function approveSeparationOverride(input: {
  requestId: string
  approverUserId: string
  comments?: string
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.emergencyOverrideRequest.findUnique({
      where: { id: input.requestId },
    })
    if (
      !request ||
      request.status !== "Pending" ||
      request.expiresAt <= new Date()
    ) {
      throw new Error("Override request is unavailable or expired.")
    }
    if (request.requesterUserId === input.approverUserId) {
      throw new Error("Override requests cannot be self-approved.")
    }
    const approval = await tx.emergencyOverrideApproval.create({
      data: {
        requestId: request.id,
        approverUserId: input.approverUserId,
        decision: "Approved",
        comments: input.comments,
      },
    })
    await tx.emergencyOverrideRequest.update({
      where: { id: request.id },
      data: { status: "Approved" },
    })
    await tx.outboxEvent.create({
      data: {
        eventType: "OVERRIDE_APPROVED",
        aggregateType: "EmergencyOverrideRequest",
        aggregateId: request.id,
        payload: { approvalId: approval.id },
      },
    })
    return approval
  })
}

export async function reassignWorkflowStep(input: {
  stepInstanceId: string
  fromUserId?: string
  toUserId: string
  changedByUserId: string
  reason: string
  delegationId?: string
  approvedOverrideRequestId?: string
}) {
  if (!input.reason.trim()) throw new Error("Reassignment reason is required.")
  return prisma.$transaction(async (tx) => {
    const step = await tx.workflowStepInstance.findUnique({
      where: { id: input.stepInstanceId },
    })
    if (!step || !["Pending", "Active"].includes(step.status)) {
      throw new Error("Only an open workflow step can be reassigned.")
    }
    const cycleSteps = await tx.workflowStepInstance.findMany({
      where: { approvalCycleId: step.approvalCycleId },
    })
    const activeAssignments = await tx.workflowAssignment.findMany({
      where: {
        stepInstanceId: { in: cycleSteps.map((item) => item.id) },
        reassignmentRequiredAt: null,
      },
    })
    const proposed = cycleSteps.map((item) => ({
      stepKey: item.stepKey,
      userIds: activeAssignments
        .filter((assignment) => assignment.stepInstanceId === item.id)
        .map((assignment) =>
          item.id === step.id &&
          (!input.fromUserId || assignment.assigneeId === input.fromUserId)
            ? input.toUserId
            : assignment.assigneeId
        ),
    }))
    const separation = evaluateSeparation(proposed)
    if (!separation.valid) {
      const override = input.approvedOverrideRequestId
        ? await tx.emergencyOverrideRequest.findUnique({
            where: { id: input.approvedOverrideRequestId },
          })
        : null
      const approval = override
        ? await tx.emergencyOverrideApproval.findFirst({
            where: {
              requestId: override.id,
              approverUserId: { not: override.requesterUserId },
              decision: "Approved",
            },
          })
        : null
      if (
        !override ||
        override.status !== "Approved" ||
        override.expiresAt <= new Date() ||
        !approval
      ) {
        throw new Error("Reassignment violates separation of duties.")
      }
    }
    if (input.delegationId) {
      const delegation = await tx.delegation.findUnique({
        where: { id: input.delegationId },
      })
      const now = new Date()
      if (
        !delegation ||
        delegation.delegateUserId !== input.toUserId ||
        delegation.delegatorUserId !== input.fromUserId ||
        delegation.revokedAt ||
        delegation.startsAt > now ||
        delegation.endsAt <= now
      ) {
        throw new Error("Delegation is invalid or outside its effective dates.")
      }
      await tx.delegationUse.create({
        data: {
          delegationId: delegation.id,
          stepInstanceId: step.id,
          usedByUserId: input.changedByUserId,
        },
      })
    }
    if (input.fromUserId) {
      await tx.workflowAssignment.updateMany({
        where: {
          stepInstanceId: step.id,
          assigneeId: input.fromUserId,
          reassignmentRequiredAt: null,
        },
        data: {
          reassignmentRequiredAt: new Date(),
          reassignmentReason: input.reason.trim(),
        },
      })
    }
    await tx.workflowAssignment.create({
      data: {
        stepInstanceId: step.id,
        assigneeType: input.delegationId ? "DELEGATE" : "USER",
        assigneeId: input.toUserId,
        snapshot: {
          userId: input.toUserId,
          reason: input.reason.trim(),
          delegationId: input.delegationId ?? null,
        },
      },
    })
    const reassignment = await tx.signerReassignment.create({
      data: {
        stepInstanceId: step.id,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        reason: input.reason.trim(),
        changedByUserId: input.changedByUserId,
      },
    })
    await tx.outboxEvent.create({
      data: {
        eventType: "ASSIGNMENT_CHANGED",
        aggregateType: "WorkflowStepInstance",
        aggregateId: step.id,
        payload: {
          reassignmentId: reassignment.id,
          toUserId: input.toUserId,
        },
      },
    })
    return reassignment
  })
}

export async function invalidateCycleForContentChange(input: {
  revisionId: string
  newPackageHash: string
  submittedToClient: boolean
  currentExternalRevision: string
}) {
  return prisma.$transaction(async (tx) => {
    const cycle = await tx.approvalCycle.findFirst({
      where: { revisionId: input.revisionId, isActive: true },
    })
    if (!cycle) return null
    await tx.approvalCycle.update({
      where: { id: cycle.id },
      data: {
        status: "Invalidated",
        isActive: false,
        invalidatedAt: new Date(),
        invalidationReason: "CONTENT_CHANGED",
      },
    })
    await tx.outboxEvent.create({
      data: {
        eventType: "CYCLE_INVALIDATED",
        aggregateType: "ApprovalCycle",
        aggregateId: cycle.id,
        payload: {
          previousPackageHash: cycle.contentHash,
          newPackageHash: input.newPackageHash,
          externalRevisionChangeRequired: input.submittedToClient,
          currentExternalRevision: input.currentExternalRevision,
        },
      },
    })
    return cycle
  })
}
