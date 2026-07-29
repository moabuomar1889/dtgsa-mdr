# Known Behavioral Defects

Date: 2026-07-29

These records preserve observed MDR behavior. Phase 2 characterizes the
behavior but does not change it.

## MDR-DEFECT-001 - Arbitrary Text Is Accepted As An Empty PDI Workbook

- Status: Characterized, not fixed.
- Severity: Medium.
- Evidence: `tests/characterization/pdi/pdi-excel.test.ts` demonstrates that
  arbitrary text currently produces an empty workbook result.
- Business risk: A malformed upload can appear to succeed with zero rows,
  hiding an operator mistake and weakening import auditability.
- Recommended correction: Reject inputs that are not valid supported workbook
  content and return an actionable validation error.
- Target phase: Phase 3, after an owner-approved behavior-change decision.

## MDR-DEFECT-002 - PDI Promotion Has No Lifecycle-Status Eligibility Gate

- Status: Characterized, not fixed.
- Severity: High.
- Evidence: The pure PDI policy test and the database-backed promotion test
  demonstrate successful promotion directly from `Draft`.
- Business risk: An item can become an MDR document before the expected client
  numbering or PDI lifecycle steps are complete.
- Recommended correction: Define the approved promotion states, enforce them
  in the transaction, and add a database-safe compare-and-set transition.
- Target phase: Phase 3, after the permitted source states are approved.

## MDR-DEFECT-003 - PDI Status Writes Do Not Validate Source State

- Status: Characterized, not fixed.
- Severity: Medium.
- Evidence: The database-backed PDI test updates an already promoted item
  through sent and client-number states without a source-state rejection.
- Business risk: Repeated or out-of-order commands can regress or rewrite the
  lifecycle state and make operational history inconsistent.
- Recommended correction: Add an explicit transition matrix, expected-state
  conditions, idempotency rules, and conflict responses.
- Target phase: Phase 3, alongside additive database constraints.

## MDR-DEFECT-004 - Repeated Workflow Decisions Are Accepted

- Status: Characterized, not fixed.
- Severity: High.
- Current behavior: A repeated review decision is accepted and creates
  additional `WorkflowAction` and `SignatureEvent` records.
- Business risk: Retries or duplicate submissions can produce conflicting
  evidence and make the workflow history overstate distinct decisions.
- Evidence: `tests/integration/database-backed-characterization.test.ts`
  records a repeated workflow decision and confirms the additional persisted
  action and signature event.
- Recommended correction: Require expected-state compare-and-set behavior and
  an idempotency key for every decision command.
- Target phase: Phase 7 - Workflow Engine.
