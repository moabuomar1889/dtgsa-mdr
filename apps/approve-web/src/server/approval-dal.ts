import "server-only"
import { classifyInboxItem, filterInbox } from "@dtg/review-domain"
import { prisma } from "./database"
import { getApprovalActor } from "./auth"

const privilegedRoles = new Set([
  "super_admin",
  "system_admin",
  "document_control_admin",
])

export async function getApprovalInbox(input: {
  state?: Parameters<typeof filterInbox>[1]["state"]
  search?: string
}) {
  const actor = await getApprovalActor()
  if (!actor) return { actor: null, items: [], counts: {} }
  const assignments = await prisma.workflowAssignment.findMany({
    where: { assigneeId: actor.id, reassignmentRequiredAt: null },
    orderBy: { assignedAt: "desc" },
    take: 200,
  })
  const steps = await prisma.workflowStepInstance.findMany({
    where: { id: { in: assignments.map((item) => item.stepInstanceId) } },
  })
  const cycles = await prisma.approvalCycle.findMany({
    where: { id: { in: steps.map((item) => item.approvalCycleId) } },
  })
  const revisions = await prisma.documentRevision.findMany({
    where: { id: { in: cycles.map((item) => item.revisionId) } },
    include: {
      document: {
        include: { project: { include: { client: true } } },
      },
    },
  })
  const stepById = new Map(steps.map((item) => [item.id, item]))
  const cycleById = new Map(cycles.map((item) => [item.id, item]))
  const revisionById = new Map(revisions.map((item) => [item.id, item]))
  const mapped = assignments.flatMap((assignment) => {
    const step = stepById.get(assignment.stepInstanceId)
    const cycle = step ? cycleById.get(step.approvalCycleId) : null
    const revision = cycle ? revisionById.get(cycle.revisionId) : null
    if (!step || !cycle || !revision) return []
    const snapshot = assignment.snapshot as {
      roleCode?: string
      delegated?: boolean
    } | null
    const policy = step.policySnapshot as {
      label?: string
      dueDays?: number
    } | null
    const dueAt =
      step.startedAt && policy?.dueDays
        ? new Date(
            step.startedAt.getTime() + policy.dueDays * 24 * 60 * 60 * 1000
          )
        : null
    return [
      {
        id: step.id,
        projectId: revision.document.projectId,
        clientId: revision.document.project.clientId,
        documentNumber: revision.document.dtgsaDocumentNumber,
        title: revision.document.title,
        revision: revision.revisionLabel,
        requiredRole: snapshot?.roleCode ?? assignment.assigneeType,
        stepLabel: policy?.label ?? step.stepKey,
        status:
          cycle.status === "Returned"
            ? "Returned"
            : step.status === "Closed" &&
                cycle.status === "ClarificationRequested"
              ? "ClarificationRequested"
              : step.status,
        dueAt,
        completedAt: step.completedAt,
        delegated: snapshot?.delegated ?? false,
        queryText: `${revision.document.project.code} ${revision.document.project.client.code}`,
        packageHash: cycle.contentHash,
        progress: `${steps.filter((item) => item.approvalCycleId === cycle.id && item.status === "Completed").length}/${steps.filter((item) => item.approvalCycleId === cycle.id && item.required).length}`,
        project: revision.document.project.name,
        client: revision.document.project.client.name,
      },
    ]
  })
  const isPrivileged = actor.systemRoles.some((role) =>
    privilegedRoles.has(role)
  )
  const allowedProjectIds = isPrivileged
    ? [...new Set(mapped.map((item) => item.projectId))]
    : actor.projectRoles.map((item) => item.projectId)
  const scoped = filterInbox(mapped, {
    allowedProjectIds,
    state: input.state,
    search: input.search,
  })
  const counts = Object.fromEntries(
    [
      "ACTIVE",
      "UPCOMING",
      "RETURNED",
      "CLARIFICATION",
      "COMPLETED",
      "DELEGATED",
      "OVERDUE",
    ].map((state) => [
      state,
      mapped.filter(
        (item) =>
          allowedProjectIds.includes(item.projectId) &&
          classifyInboxItem(item) === state
      ).length,
    ])
  )
  return {
    actor: {
      id: actor.id,
      fullName: actor.fullName,
      email: actor.email,
    },
    items: scoped,
    counts,
  }
}

export async function getReviewCase(stepInstanceId: string) {
  const actor = await getApprovalActor()
  if (!actor) return null
  const assignment = await prisma.workflowAssignment.findFirst({
    where: {
      stepInstanceId,
      assigneeId: actor.id,
      reassignmentRequiredAt: null,
    },
  })
  if (!assignment) return null
  const step = await prisma.workflowStepInstance.findUnique({
    where: { id: stepInstanceId },
  })
  const cycle = step
    ? await prisma.approvalCycle.findUnique({
        where: { id: step.approvalCycleId },
      })
    : null
  const revision = cycle
    ? await prisma.documentRevision.findUnique({
        where: { id: cycle.revisionId },
        include: {
          document: { include: { project: { include: { client: true } } } },
          controlledMainFiles: {
            where: { isActive: true },
            include: { fileObject: true },
            take: 1,
          },
        },
      })
    : null
  if (!step || !cycle || !revision) return null
  const review = await prisma.reviewSession.findFirst({
    where: {
      stepInstanceId: step.id,
      userId: actor.id,
      revokedAt: null,
    },
    orderBy: { startedAt: "desc" },
    include: { pageEvents: { orderBy: { occurredAt: "desc" }, take: 20 } },
  })
  const comments = await prisma.comment.findMany({
    where: { revisionId: revision.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return {
    step: {
      id: step.id,
      key: step.stepKey,
      label:
        (step.policySnapshot as { label?: string } | null)?.label ??
        step.stepKey,
      status: step.status,
      stateVersion: step.expectedStateVersion,
    },
    document: {
      revisionId: revision.id,
      number: revision.document.dtgsaDocumentNumber,
      title: revision.document.title,
      revision: revision.revisionLabel,
      project: revision.document.project.name,
      client: revision.document.project.client.name,
      packageHash: cycle.contentHash,
      fileObjectId: revision.controlledMainFiles[0]?.fileObjectId ?? null,
      fileName:
        revision.controlledMainFiles[0]?.fileObject.fileName ??
        "Controlled PDF",
      sizeBytes: Number(
        revision.controlledMainFiles[0]?.fileObject.sizeBytes ?? 0
      ),
    },
    review: review
      ? {
          id: review.id,
          firstOpenedAt: review.firstOpenedAt?.toISOString() ?? null,
          lastActivityAt: review.lastActivityAt?.toISOString() ?? null,
          activeSeconds: review.approximateActiveSeconds,
          completedAt: review.completedAt?.toISOString() ?? null,
          expiresAt: review.expiresAt?.toISOString() ?? null,
          declarationAccepted: Boolean(review.declarationAcceptedAt),
          renderedPages: [
            ...new Set(review.pageEvents.map((item) => item.pageNumber)),
          ],
        }
      : null,
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      blocking: comment.blocking,
      state: comment.state,
      category: comment.category,
      dueAt: comment.dueAt?.toISOString() ?? null,
    })),
  }
}
