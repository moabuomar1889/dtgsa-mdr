# Current State

Date: 2026-07-29

Repository: `moabuomar1889/dtgsa-mdr`

Branch: `codex/dtg-signature-platform-merge`

## Phase Status

- Phase 0: COMPLETE
- Phase 1: COMPLETE
- Phase 1.5: COMPLETE
- Phase 2: COMPLETE after all recorded gates
- Phase 3: CLOSED / NOT_STARTED

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

Phase 2 adds independent foundations:

- `apps/approve-web`: truthful shell and operational endpoints.
- `apps/verify-web`: privacy-safe shell and operational endpoints.
- `apps/platform-api`: health, readiness, and version endpoints only.
- `apps/worker`: lifecycle, configuration, health state, and no jobs.
- Eight meaningful `@dtg/*` packages with enforced dependency direction.

## Database State

The authoritative Prisma schema and migration remain at the repository root.
There are 22 enums, 42 models, and one migration:

```text
20260329143000_init_foundation
```

Phase 2 made no model or migration SQL change.

## Validation State

The previous 65 tests remain. Eight new architecture/foundation tests bring
the complete suite to 73 tests with zero failures and zero skips. Production
builds pass for all five application units. Typecheck, ESLint, Prisma
validation, architecture validation, documentation validation, and disposable
empty-database migration validation are Phase 2 gates.

## Known Limits

Approval, verification, configurable workflow, target database models,
Google Workspace identity, controlled Drive, manifest/evidence, background
jobs, deployment, and production connections are not implemented in Phase 2.
The four known behavioral defects remain recorded and intentionally unchanged.
