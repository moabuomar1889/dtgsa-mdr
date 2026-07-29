# Known Behavioral Defects

Date: 2026-07-29

These records preserve observed MDR behavior and approved changes. Phase 3
closes defects 001, 002, and 003. Defect 004 remains characterized.

## MDR-DEFECT-001 - Arbitrary Text Is Accepted As An Empty PDI Workbook

- Status: FIXED in Phase 3.
- Severity: Medium.
- Evidence: `tests/characterization/pdi/pdi-excel.test.ts` verifies that
  arbitrary text is rejected with an actionable workbook validation error.
- Business risk: A malformed upload can appear to succeed with zero rows,
  hiding an operator mistake and weakening import auditability.
- Implemented correction: Validate the XLSX ZIP signature and normalize parser
  failures to an actionable validation error.

## MDR-DEFECT-002 - PDI Promotion Has No Lifecycle-Status Eligibility Gate

- Status: FIXED in Phase 3.
- Severity: High.
- Evidence: Pure policy and database-backed tests verify that promotion is
  rejected until the item reaches `ClientNumberReceived`.
- Business risk: An item can become an MDR document before the expected client
  numbering or PDI lifecycle steps are complete.
- Implemented correction: Enforce `ClientNumberReceived` in the domain policy
  and use an expected-state compare-and-set transaction during promotion.

## MDR-DEFECT-003 - PDI Status Writes Do Not Validate Source State

- Status: FIXED in Phase 3.
- Severity: Medium.
- Evidence: Characterization and database-backed tests cover the allowed
  transition matrix, repeated commands, and rejected backward transitions.
- Business risk: Repeated or out-of-order commands can regress or rewrite the
  lifecycle state and make operational history inconsistent.
- Implemented correction: Add an explicit transition matrix, expected-state
  compare-and-set writes, and same-state no-op behavior without duplicate
  audit side effects.

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
# Phase 7 Closure

`MDR-DEFECT-004` is closed for the configurable workflow engine. Decisions now
use expected-state compare-and-set, serializable transactions, unique
idempotency keys, and one immutable evidence record. The legacy workflow remains
available only for migration parity and retains its legacy trust classification.
