# DTG Signature Platform Merge Implementation Plan

Date: 2026-07-29
Repository: moabuomar1889/dtgsa-mdr
Branch: codex/dtg-signature-platform-merge

## Implementation Principle

This is a staged modernization of the existing MDR application. The MDR system must remain working while reusable document-control, workflow, storage, signature, verification, and integration domains are extracted.

## Phase 0 - Graphify And Baseline

Status: COMPLETE

Completed:

- Created dedicated branch `codex/dtg-signature-platform-merge`.
- Read the focused merge-readiness report.
- Located and read the DTG development standards repository.
- Recorded standard commit in `STANDARD_VERSION`.
- Ran Graphify code-only baseline and cluster report.
- Recorded Graphify limitations.
- Recorded Git, route, Prisma, migration, lint, typecheck, and build baseline.
- Created Phase 0 documentation.

Blocked or partial:

- Graphify semantic extraction is blocked until an approved LLM backend is configured.
- Detailed DTG standards are not available in the standards repository at the inspected commit.

## Phase 1 - Characterization Tests

Status: COMPLETE

Required tests:

- Document numbering.
- PDI Excel import/export.
- PDI promotion to MDR.
- Current workflow transitions.
- Review-code precedence.
- Client replies and response effects.
- Revision lineage.
- Transmittal eligibility.
- Search and read models.
- PDF utility behavior.
- Authorization vocabulary and representative project scoping.

Exit criteria:

- PASS: tests run in CI-friendly non-interactive mode.
- PASS: deterministic current behavior is protected before package extraction.
- PASS: database transaction, rollback, and database-backed read-model behavior is completed in Phase 1.5.

Phase 2 gate:

- SATISFIED by owner authorization after Phase 1.5 report review.

## Phase 1.5 - Database-Backed Characterization Closure

Status: COMPLETE

Completed:

- Added pinned disposable PostgreSQL 17.10 lifecycle tooling.
- Applied the existing migration to an empty database.
- Completed all seven previously skipped database-backed test areas.
- Added deterministic database fixtures and fail-closed cleanup.
- Added narrow transmittal delivery adapters for test fakes.
- Recorded three intentionally preserved behavioral defects.
- Reached 65 passed tests with zero failures and zero skips.

Phase 2 gate:

- SATISFIED by explicit owner approval.

## Phase 2 - Monorepo Foundation

Status: COMPLETE

Required work:

- Preserve the current MDR application as `apps/mdr-web`.
- Create `apps/approve-web`, `apps/verify-web`, `apps/platform-api`, and `apps/worker`.
- Create initial packages for domain boundaries.
- Add architecture-boundary checks.
- Keep deployments independently addressable.

Exit criteria:

- PASS: Existing MDR build and route parity pass.
- PASS: New apps compile as truthful minimal deployable foundations.
- PASS: Shared packages have explicit ownership and no workspace cycles.
- PASS: Phase 2 report records the exact validation evidence.

## Phase 3 - Database Foundation

Status: CLOSED / NOT_STARTED

Required work:

- Add additive schema models for identity, controlled files, workflow snapshots, approval cycles, package manifests, evidence, client response policies, outbox, jobs, and integration records.
- Add indexes, constraints, idempotency records, and audit rules.
- Validate migrations from an empty database.

Exit criteria:

- Prisma validates.
- Empty-database migration succeeds.
- No destructive external database reset is performed without owner approval.

## Phase 4 - Identity

Status: NOT_STARTED

Required work:

- Google Workspace OIDC for employees.
- Immutable Google subject mapping.
- Google group to role mapping.
- External Magic Link client portal access.
- Session security and suspended-user handling.

Exit criteria:

- Employees cannot sign through password auth.
- External clients cannot access internal Workspace-only surfaces.

## Phase 5 - Controlled Google Drive

Status: NOT_STARTED

Required work:

- Google Picker.
- Controlled copy to DTG Controlled Documents.
- Drive File ID as primary external reference.
- One controlled Main PDF per external revision.
- SHA-256 validation and reconciliation.

Exit criteria:

- Rename or move in Drive does not break document identity.
- No raw Drive IDs or uncontrolled links are exposed to normal users.

## Phase 6 - Manifest And Evidence

Status: NOT_STARTED

Required work:

- Canonical package manifest.
- Package hash.
- Approval evidence.
- Signing-provider and PDF-seal-provider interfaces.
- Central application-level seal and verification record.

Exit criteria:

- Approval evidence binds identity, role snapshot, document number, revision, main-file hash, package hash, workflow snapshot, declaration, and timestamp.

## Phase 7 - Workflow Engine

Status: NOT_STARTED

Required work:

- Versioned workflow definitions.
- Workflow snapshots.
- Approval cycles.
- Sequential and parallel steps.
- Assignment rules.
- Separation-of-duties enforcement.
- Emergency override process.
- Idempotent decisions.

Exit criteria:

- Prepared By Manager, Reviewer, Approver, and DC Validator separation is enforced by default.
- Workflow template edits do not mutate historical snapshots.

## Phase 8 - Cover Designer

Status: NOT_STARTED

Required work:

- Versioned cover templates.
- Visual layout elements.
- Signature boxes.
- Prepared By Manager formal signature.
- Client/project inheritance.
- Preview and publish flow.

Exit criteria:

- Historical covers remain immutable after template edits.

## Phase 9 - Approval Application

Status: NOT_STARTED

Required work:

- Approval inbox.
- Exact document review.
- Lightweight PDF viewer.
- Comments.
- Approve, return, reject, and DC validation.
- Help content.

Exit criteria:

- A signer cannot approve before reviewing the exact controlled package.

## Phase 10 - Downloads And Worker

Status: NOT_STARTED

Required work:

- Worker and durable outbox.
- On-demand Signed Internally PDF.
- Temporary assembly and cleanup.
- Artifact hashes.
- Email, notification, transmittal, Drive, and webhook jobs.

Exit criteria:

- Large PDF work is removed from web-request scope.
- Worker jobs are idempotent and retryable.

## Phase 11 - Client Responses And Revisions

Status: NOT_STARTED

Required work:

- Versioned project response code sets.
- Response policy snapshots.
- Primary response file plus attachments.
- Dynamic response labels and effects.
- Revision wizard.
- Full historical preservation.

Exit criteria:

- Code labels do not hardcode behavior.
- Client-required content change creates a new external revision and restarts approval.

## Phase 12 - Verification Portal

Status: NOT_STARTED

Required work:

- QR verification.
- Verification code lookup.
- Main-file hash verification.
- Generated artifact hash verification.
- Public/private views.
- Rate limiting.

Exit criteria:

- Modified generated downloads fail verification.
- Public verification does not expose private internal data.

## Phase 13 - Integrations And General Requests

Status: NOT_STARTED

Required work:

- OpenAPI contracts.
- Integration clients.
- Idempotency keys.
- HMAC webhooks.
- General employee requests.
- Reusable SDK/contracts.

Exit criteria:

- Integration API does not leak secrets, raw Drive IDs, or private data.

## Phase 14 - DevOps And Operations

Status: NOT_STARTED

Required work:

- Docker and Coolify deployment materials.
- Health endpoints.
- Structured logs.
- Monitoring.
- Backup and restore runbooks.
- CI/CD.

Exit criteria:

- Production deployment gates are explicit and repeatable.

## Phase 15 - Final Consolidation

Status: NOT_STARTED

Required work:

- Final Graphify update.
- Full validation suite.
- Security scans.
- Migration tests.
- Large-file tests.
- Tamper tests.
- Authorization tests.
- Documentation checks.
- Final implementation report.

Exit criteria:

- `docs/reports/FINAL_MERGE_IMPLEMENTATION_REPORT.md` classifies every major item honestly as complete, partially complete, blocked, deferred, or not started.
