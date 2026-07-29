# Current State

Date: 2026-07-29

Repository: `moabuomar1889/dtgsa-mdr`

Branch: `codex/dtg-signature-platform-merge`

## Phase Status

- Phase 0: COMPLETE
- Phase 1: COMPLETE
- Phase 1.5: COMPLETE
- Phase 2: COMPLETE after all recorded gates
- Phase 3: COMPLETE after all recorded gates
- Phase 4: CLOSED / NOT_STARTED

## Authoritative Workspace

The only authoritative workspace is:

```text
C:\Users\moabu\Documents\Codex\Projects\dtgsa-mdr
```

The obsolete Google Drive clone was removed and must not be used.

## Product State

The existing MDR/PDI application is under `apps/mdr-web`. Its existing routes,
Supabase authentication, Supabase storage, Prisma transactions, Google Drive
integration behavior, fixed workflow, numbering, PDI, revisions, client
replies, signatures, transmittals, and PDF behavior remain unchanged.

The modular workspace contains:

- `apps/approve-web`: truthful shell and operational endpoints.
- `apps/verify-web`: privacy-safe shell and operational endpoints.
- `apps/platform-api`: health, readiness, and version endpoints only.
- `apps/worker`: lifecycle, configuration, health state, and no jobs.
- Eight meaningful `@dtg/*` packages with enforced dependency direction.

Phase 3 intentionally changes three approved PDI behaviors: invalid workbook
content is rejected, promotion requires `ClientNumberReceived`, and PDI status
writes use an explicit forward-only transition policy with idempotent retries.
The existing workflow engine and all other characterized MDR behavior remain
the compatibility path.

## Database State

The authoritative Prisma schema and additive migration history remain at the
repository root. Phase 3 adds normalized foundations for identity, controlled
files, workflows, covers, package evidence, client responses, comments,
durable jobs, integrations, retention, and audit integrity.

```text
20260329143000_init_foundation
20260729111500_phase3_database_foundation
```

Legacy models remain readable. Database SQL enforces one active controlled
Main File per revision, one active approval cycle per revision, published
version immutability, and append-only audit rows.

## Validation State

The complete Phase 3 result is recorded in
`docs/reports/PHASE_3_DATABASE_FOUNDATION_REPORT.md`. The report contains exact
test, build, migration, architecture, documentation, and Graphify evidence.

## Known Limits

The new domain tables are foundations only: no Google identity, Drive,
workflow, signing, sealing, verification, background worker, or deployment
runtime is activated. PAdES remains inactive. `MDR-DEFECT-004` remains open for
the workflow-engine phase. Phase 4 must not begin without owner review.
