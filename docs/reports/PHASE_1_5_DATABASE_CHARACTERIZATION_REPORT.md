# Phase 1.5 Database Characterization Report

Date: 2026-07-29

## 1. Executive Summary

Phase 1.5 is complete. A disposable loopback-only PostgreSQL environment now
applies the existing migration and executes all seven previously skipped
database-backed areas. The full suite passes 65 of 65 tests with no failures or
skips. Phase 2 remains closed for owner review.

## 2. Branch and Commit

- Branch: `codex/dtg-signature-platform-merge`
- Starting commit: `224d9f4909a2a1668b7fd7995080454baefd9a4d`
- Phase implementation commit:
  `eb80f0ae83519a823a6bbd7ffd052685088f6581`

## 3. Disposable Database Architecture

Docker, native PostgreSQL, and WSL PostgreSQL were unavailable on the host.
The repository therefore uses the equivalent local service
`embedded-postgres@17.10.0-beta.17`. It binds PostgreSQL to `127.0.0.1` on a
random free port and creates a unique data directory under `.test-postgres/`.
No external database is contacted.

## 4. Database Safety Controls

The runner requires an explicit `TEST_DATABASE_URL`, validates the parsed host
and database name before use, accepts only local or explicitly approved hosts,
requires a test or characterization marker, rejects production-like names, and
prints a redacted URL. `DATABASE_URL` is assigned only from the generated,
validated test URL in the child process. Passwords are never printed.

## 5. PostgreSQL Version

PostgreSQL `17.10`, pinned through
`embedded-postgres@17.10.0-beta.17`.

## 6. Test Database Lifecycle

`scripts/run-database-characterization.mjs` allocates a random port and
synthetic password, initializes the cluster, starts it, creates
`dtgsa_mdr_characterization_test`, validates connectivity, applies migrations,
runs the requested suite, stops PostgreSQL in `finally`, and removes the data
directory. Package commands expose database check, migration check,
integration, cleanup, and CI workflows.

## 7. Migration Result

PASS. The empty database applied the single existing migration
`20260329143000_init_foundation`. Prisma reported that all migrations were
successfully applied. No schema or target-platform migration was added.

## 8. Fixture Strategy

Test-specific factories create synthetic users, roles, permissions, clients,
projects, disciplines, document types, release purposes, numbering rules,
review codes, PDI records, MDR documents, revisions, workflow steps, files,
transmittals, replies, and notifications. Every test truncates only the
validated disposable database with foreign-key-safe cascade cleanup.

## 9. Numbering Transaction Coverage

Coverage protects controlled concurrent allocation, unique results, repeated
allocation, per-project sequence scope, sequence state, transaction rollback,
duplicate document-number rejection, and the database unique constraints.

## 10. PDI-to-MDR Persistence Coverage

Coverage protects MDR creation, first revision creation, current-revision
pointer, metadata transfer, four workflow steps, source PDI relationship,
status update, audit record, duplicate-promotion rejection, and rollback on a
document-number conflict. Promotion from `Draft` is intentionally retained.

## 11. Workflow Persistence Coverage

Coverage protects prepared, reviewed, approved, DC-approved, review-rejected,
and DC-returned transitions; workflow actions; signature events; workflow step
updates; revision/document status updates; and rollback when a signature
profile is missing. Repeated review decisions are currently accepted and create
additional evidence records.

## 12. Client Reply Coverage

Coverage protects reply creation, review-code and submitted-revision linkage,
returned-file name metadata, reply-state calculation, audit records, multiple
replies, document/revision updates, and rollback when a transmittal link is
invalid.

## 13. Revision Lineage Coverage

Coverage protects same-number revision `01`, `parentRevisionId`,
`sourceClientReplyId`, fresh workflow steps, current-pointer replacement,
preservation of the superseded revision, absence of copied signatures, the
new-document-number replacement path, and rollback on a revision-label
collision.

## 14. Transmittal Coverage

Coverage protects number generation, project and eligible-revision checks,
recipient fields, item insertion, duplicate reservation prevention,
`ReadyToSend`, `Sent`, `SubmittedToClient`, generated-document metadata, audit,
notification, and failure-before-transaction behavior. Storage, Drive, signed
URL, email, and role notification calls use narrow test adapters.

## 15. Read-Model Coverage

Coverage protects empty state, global search, document-number and title search,
PDI/MDR/transmittal/reply results, project scoping, dashboard counts, task and
unread-notification counts, waiting-client-reply counts, workflow/report
aggregates, and hidden results from an inaccessible project.

## 16. Concurrency Findings

Number allocation produced four unique consecutive values under controlled
parallel transactions. The current workflow has no expected-state compare and
set; a repeated review decision is accepted and creates another signature and
action. Concurrent duplicate decisions therefore remain race-prone current
behavior for later redesign.

## 17. Rollback Findings

Sequence increments roll back with their transaction. PDI promotion rolls back
revision/status writes on uniqueness failure. Client reply creation rolls back
when lineage creation collides. Workflow writes do not begin without a required
signature. Transmittal state remains `ReadyToSend` when the fake upload fails
before the persistence transaction.

## 18. Constraint Findings

The existing database enforces unique PDI document numbers per project,
unique MDR document numbers per project, one revision label per document,
one workflow step type per revision, unique numbering sequence scope per rule,
one PDI register per project, and unique transmittal numbers per project.

## 19. Characterized Defects

`MDR-DEFECT-001`, `MDR-DEFECT-002`, and `MDR-DEFECT-003` are recorded in
`docs/KNOWN_BEHAVIORAL_DEFECTS.md`. All three remain intentionally unfixed.

## 20. New Test Inventory

- 8 database-safety unit tests.
- 50 deterministic characterization tests.
- 7 executable database-backed integration tests.
- 65 total tests.

## 21. Commands Executed

```text
pnpm test:unit
pnpm test:characterization
pnpm test:integration
pnpm test
pnpm test:ci
pnpm lint
pnpm exec prisma validate
pnpm test:db:migrate
pnpm typecheck
pnpm build
pnpm docs:validate:phase1
pnpm docs:validate:phase1.5
graphify update .
git diff --check
git status --short
```

## 22. Exact Pass/Fail/Skip Counts

| Suite            | Total | Passed | Failed | Skipped | Cancelled | Todo |
| ---------------- | ----: | -----: | -----: | ------: | --------: | ---: |
| Unit             |     8 |      8 |      0 |       0 |         0 |    0 |
| Characterization |    50 |     50 |      0 |       0 |         0 |    0 |
| Integration      |     7 |      7 |      0 |       0 |         0 |    0 |
| Full CI          |    65 |     65 |      0 |       0 |         0 |    0 |

## 23. Test Database Cleanup Result

PASS. Every observed run printed the stop-and-remove confirmation. The
ephemeral run directory was deleted after successful and failed test attempts.

## 24. Build Results

PASS. Next.js `16.2.1` compile mode and optimized production build completed.
The production build completed TypeScript checking, page-data collection, and
static generation.

## 25. Lint Results

PASS. ESLint completed with zero errors and zero warnings after cleanup.

## 26. Prisma Validation

PASS. Prisma `7.6.0` reported `prisma/schema.prisma` as valid.

## 27. Documentation Validation

PASS. Phase 1 and Phase 1.5 required-section validators completed after the
documentation updates.

## 28. Remaining Coverage Gaps

Real Supabase, Google Drive, email, LibreOffice, browser, deployment, large-file
performance, and live identity sessions remain outside Phase 1.5. Workflow
duplicate-decision races are characterized but not redesigned. No production
or external database was tested.

## 29. Phase 1 Final Exit Verdict

PASS. Phase 1 and Phase 1.5 together protect deterministic and database-backed
current MDR behavior with no skipped database cases.

## 30. Phase 2 Readiness Verdict

READY FOR OWNER REVIEW, NOT AUTHORIZED TO START. The characterization gate is
technically satisfied, but Phase 2 remains closed until the owner explicitly
approves progression.

## 31. Commit SHA

The Phase 1.5 implementation and validation evidence were committed as:

```text
eb80f0ae83519a823a6bbd7ffd052685088f6581
```

The subsequent documentation-only finalization commit records this immutable
implementation SHA.

## 32. Final Git Status

PASS. `git status --short` was empty immediately after the implementation
commit. It is verified again after the documentation-only finalization commit
and push.
