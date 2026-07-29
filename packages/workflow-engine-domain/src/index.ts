import { createHash } from "node:crypto"

export type AssignmentStrategy =
  | "PERSON"
  | "PROJECT_ROLE"
  | "DEPARTMENT_ROLE"
  | "GOOGLE_GROUP"
  | "DYNAMIC"

export type WorkflowStepPolicy = {
  key: string
  order: number
  label: string
  required: boolean
  parallelGroup?: string
  quorum: number
  assignment: {
    strategy: AssignmentStrategy
    value: string
    fallback?: string
    allowPool?: boolean
  }
  reviewRequired: boolean
  commentRequired: boolean
  dcValidation: boolean
  returnTargets: string[]
}

export type WorkflowDefinitionPolicy = {
  kind: string
  dcRequired: boolean
  steps: WorkflowStepPolicy[]
}

export const DEFAULT_ENGINEERING_WORKFLOW: WorkflowDefinitionPolicy = {
  kind: "ENGINEERING",
  dcRequired: true,
  steps: [
    {
      key: "prepared",
      order: 1,
      label: "Prepared By Manager",
      required: true,
      quorum: 1,
      assignment: { strategy: "PROJECT_ROLE", value: "discipline_user" },
      reviewRequired: true,
      commentRequired: false,
      dcValidation: false,
      returnTargets: [],
    },
    {
      key: "reviewed",
      order: 2,
      label: "Independent Reviewer",
      required: true,
      quorum: 1,
      assignment: { strategy: "PROJECT_ROLE", value: "reviewer" },
      reviewRequired: true,
      commentRequired: false,
      dcValidation: false,
      returnTargets: ["prepared"],
    },
    {
      key: "approved",
      order: 3,
      label: "Approver",
      required: true,
      quorum: 1,
      assignment: { strategy: "PROJECT_ROLE", value: "approver" },
      reviewRequired: true,
      commentRequired: false,
      dcValidation: false,
      returnTargets: ["prepared", "reviewed"],
    },
    {
      key: "dc-validated",
      order: 4,
      label: "DC Validator",
      required: true,
      quorum: 1,
      assignment: { strategy: "PROJECT_ROLE", value: "dtgsa_dc_admin" },
      reviewRequired: true,
      commentRequired: false,
      dcValidation: true,
      returnTargets: ["prepared"],
    },
  ],
}

export function validateDefinition(definition: WorkflowDefinitionPolicy) {
  const keys = new Set<string>()
  for (const step of definition.steps) {
    if (keys.has(step.key))
      throw new Error(`Duplicate workflow step: ${step.key}`)
    keys.add(step.key)
    if (step.quorum < 1) throw new Error("Workflow quorum must be positive.")
  }
  if (
    definition.dcRequired &&
    !definition.steps.some((step) => step.required && step.dcValidation)
  ) {
    throw new Error("A required DC Validator step is mandatory.")
  }
  return definition
}

export function workflowDigest(definition: WorkflowDefinitionPolicy) {
  const normalized = {
    ...validateDefinition(definition),
    steps: [...definition.steps].sort(
      (a, b) => a.order - b.order || a.key.localeCompare(b.key)
    ),
  }
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex")
}

export type ResolvedAssignment = {
  stepKey: string
  userIds: string[]
}

export type AssignmentCandidate = {
  userId: string
  projectRoles?: string[]
  departmentRoles?: string[]
  googleGroups?: string[]
  dynamicKeys?: string[]
}

export function resolveStepAssignment(
  step: WorkflowStepPolicy,
  candidates: AssignmentCandidate[]
): ResolvedAssignment {
  const matched = candidates.filter((candidate) => {
    switch (step.assignment.strategy) {
      case "PERSON":
        return candidate.userId === step.assignment.value
      case "PROJECT_ROLE":
        return candidate.projectRoles?.includes(step.assignment.value)
      case "DEPARTMENT_ROLE":
        return candidate.departmentRoles?.includes(step.assignment.value)
      case "GOOGLE_GROUP":
        return candidate.googleGroups?.includes(step.assignment.value)
      case "DYNAMIC":
        return candidate.dynamicKeys?.includes(step.assignment.value)
    }
  })
  const fallback =
    matched.length === 0 && step.assignment.fallback
      ? candidates.filter(
          (candidate) => candidate.userId === step.assignment.fallback
        )
      : []
  return {
    stepKey: step.key,
    userIds: [
      ...new Set(
        [...matched, ...fallback].map((candidate) => candidate.userId)
      ),
    ].sort(),
  }
}

export function validateAssignments(
  definition: WorkflowDefinitionPolicy,
  assignments: ResolvedAssignment[]
) {
  for (const step of definition.steps) {
    const users =
      assignments.find((item) => item.stepKey === step.key)?.userIds ?? []
    if (step.required && users.length === 0) {
      throw new Error(`No assignee resolved for required step ${step.key}.`)
    }
    if (users.length > 1 && !step.assignment.allowPool) {
      throw new Error(`Ambiguous assignee for step ${step.key}.`)
    }
  }
}

const DUTY_CONFLICTS = [
  ["prepared", "reviewed"],
  ["reviewed", "approved"],
  ["approved", "dc-validated"],
  ["prepared", "dc-validated"],
] as const

export function evaluateSeparation(assignments: ResolvedAssignment[]) {
  const conflicts: Array<{ first: string; second: string; userId: string }> = []
  for (const [first, second] of DUTY_CONFLICTS) {
    const left =
      assignments.find((item) => item.stepKey === first)?.userIds ?? []
    const right = new Set(
      assignments.find((item) => item.stepKey === second)?.userIds ?? []
    )
    for (const userId of left) {
      if (right.has(userId)) conflicts.push({ first, second, userId })
    }
  }
  return { valid: conflicts.length === 0, conflicts }
}

export function assertReviewEligibility(input: {
  reviewUserId: string
  actorUserId: string
  reviewPackageHash: string
  currentPackageHash: string
  reviewCompletedAt?: Date | null
  reviewExpiresAt: Date
  recentAuthExpiresAt: Date
  declarationAccepted: boolean
  now?: Date
}) {
  const now = input.now ?? new Date()
  if (input.reviewUserId !== input.actorUserId)
    throw new Error("Review session belongs to another user.")
  if (input.reviewPackageHash !== input.currentPackageHash)
    throw new Error("Review session Package Hash does not match.")
  if (!input.reviewCompletedAt || input.reviewExpiresAt <= now)
    throw new Error("A valid completed review session is required.")
  if (input.recentAuthExpiresAt <= now)
    throw new Error("Recent authentication has expired.")
  if (!input.declarationAccepted)
    throw new Error("The approval declaration is required.")
}

export function nextEligibleSteps(input: {
  steps: Array<{
    key: string
    order: number
    parallelGroup?: string | null
    required: boolean
    status: string
  }>
}) {
  const pending = input.steps.filter((step) => step.status === "Pending")
  if (pending.length === 0) return []
  const firstOrder = Math.min(...pending.map((step) => step.order))
  const first = pending.find((step) => step.order === firstOrder)!
  return pending.filter(
    (step) =>
      step.order === firstOrder ||
      (first.parallelGroup && step.parallelGroup === first.parallelGroup)
  )
}

export function parallelQuorumSatisfied(input: {
  statuses: string[]
  quorum: number
}) {
  if (input.quorum < 1) throw new Error("Parallel quorum must be positive.")
  return (
    input.statuses.filter((status) => status === "Completed").length >=
    input.quorum
  )
}

export function legacyWorkflowParity() {
  return DEFAULT_ENGINEERING_WORKFLOW.steps.map((step) => step.key)
}
