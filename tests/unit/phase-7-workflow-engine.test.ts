import assert from "node:assert/strict"
import { test } from "node:test"
import {
  DEFAULT_ENGINEERING_WORKFLOW,
  assertReviewEligibility,
  evaluateSeparation,
  legacyWorkflowParity,
  nextEligibleSteps,
  parallelQuorumSatisfied,
  resolveStepAssignment,
  validateAssignments,
  validateDefinition,
  workflowDigest,
} from "../../packages/workflow-engine-domain/src/index"

test("default engineering workflow preserves legacy parity and mandatory DC", () => {
  assert.deepEqual(legacyWorkflowParity(), [
    "prepared",
    "reviewed",
    "approved",
    "dc-validated",
  ])
  assert.equal(
    validateDefinition(DEFAULT_ENGINEERING_WORKFLOW).steps.at(-1)?.dcValidation,
    true
  )
})

test("definition digest is version-snapshot deterministic", () => {
  assert.equal(
    workflowDigest(DEFAULT_ENGINEERING_WORKFLOW),
    workflowDigest({
      ...DEFAULT_ENGINEERING_WORKFLOW,
      steps: [...DEFAULT_ENGINEERING_WORKFLOW.steps].reverse(),
    })
  )
  assert.throws(() =>
    validateDefinition({
      kind: "ENGINEERING",
      dcRequired: true,
      steps: DEFAULT_ENGINEERING_WORKFLOW.steps.slice(0, 3),
    })
  )
})

test("assignments reject missing and ambiguous required assignees", () => {
  assert.throws(() => validateAssignments(DEFAULT_ENGINEERING_WORKFLOW, []))
  assert.throws(() =>
    validateAssignments(DEFAULT_ENGINEERING_WORKFLOW, [
      { stepKey: "prepared", userIds: ["one", "two"] },
    ])
  )
})

test("separation of duties detects every default conflict", () => {
  const result = evaluateSeparation([
    { stepKey: "prepared", userIds: ["same"] },
    { stepKey: "reviewed", userIds: ["same"] },
    { stepKey: "approved", userIds: ["same"] },
    { stepKey: "dc-validated", userIds: ["same"] },
  ])
  assert.equal(result.valid, false)
  assert.equal(result.conflicts.length, 4)
})

test("review eligibility is mandatory and package/user/time bound", () => {
  const valid = {
    reviewUserId: "user-1",
    actorUserId: "user-1",
    reviewPackageHash: "hash-1",
    currentPackageHash: "hash-1",
    reviewCompletedAt: new Date("2026-07-29T00:00:00Z"),
    reviewExpiresAt: new Date("2026-07-29T01:00:00Z"),
    recentAuthExpiresAt: new Date("2026-07-29T01:00:00Z"),
    declarationAccepted: true,
    now: new Date("2026-07-29T00:30:00Z"),
  }
  assert.doesNotThrow(() => assertReviewEligibility(valid))
  assert.throws(() =>
    assertReviewEligibility({ ...valid, reviewPackageHash: "wrong" })
  )
  assert.throws(() =>
    assertReviewEligibility({
      ...valid,
      recentAuthExpiresAt: new Date("2026-07-29T00:00:00Z"),
    })
  )
})

test("parallel eligible steps activate together", () => {
  assert.deepEqual(
    nextEligibleSteps({
      steps: [
        {
          key: "one",
          order: 1,
          parallelGroup: "g1",
          required: true,
          status: "Pending",
        },
        {
          key: "two",
          order: 2,
          parallelGroup: "g1",
          required: true,
          status: "Pending",
        },
        {
          key: "three",
          order: 3,
          required: true,
          status: "Pending",
        },
      ],
    }).map((step) => step.key),
    ["one", "two"]
  )
})

test("person, role, group, dynamic, and fallback assignments resolve deterministically", () => {
  const candidates = [
    {
      userId: "one",
      projectRoles: ["reviewer"],
      departmentRoles: ["manager"],
      googleGroups: ["dc-group"],
      dynamicKeys: ["document-owner"],
    },
    { userId: "fallback" },
  ]
  const base = DEFAULT_ENGINEERING_WORKFLOW.steps[0]!
  for (const [strategy, value] of [
    ["PERSON", "one"],
    ["PROJECT_ROLE", "reviewer"],
    ["DEPARTMENT_ROLE", "manager"],
    ["GOOGLE_GROUP", "dc-group"],
    ["DYNAMIC", "document-owner"],
  ] as const) {
    assert.deepEqual(
      resolveStepAssignment(
        { ...base, assignment: { strategy, value } },
        candidates
      ).userIds,
      ["one"]
    )
  }
  assert.deepEqual(
    resolveStepAssignment(
      {
        ...base,
        assignment: {
          strategy: "GOOGLE_GROUP",
          value: "missing",
          fallback: "fallback",
        },
      },
      candidates
    ).userIds,
    ["fallback"]
  )
})

test("parallel quorum and optional-step policies are explicit", () => {
  assert.equal(
    parallelQuorumSatisfied({
      statuses: ["Completed", "Active", "Pending"],
      quorum: 1,
    }),
    true
  )
  assert.equal(
    parallelQuorumSatisfied({
      statuses: ["Completed", "Active", "Pending"],
      quorum: 2,
    }),
    false
  )
  const nonEngineering = validateDefinition({
    kind: "HR",
    dcRequired: false,
    steps: [
      {
        ...DEFAULT_ENGINEERING_WORKFLOW.steps[0]!,
        key: "hr-review",
        required: false,
        dcValidation: false,
      },
    ],
  })
  assert.equal(nonEngineering.dcRequired, false)
})
