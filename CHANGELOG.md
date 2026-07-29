# Changelog

## Unreleased

### Phase 3 - Database Foundation

- Added additive identity, controlled-file, workflow, cover, evidence, client
  response, comment, job, integration, retention, and audit foundation models.
- Added database-enforced one-Main-File and one-active-cycle invariants.
- Added published-version immutability and append-only audit triggers.
- Added password-free least-privilege database role templates.
- Corrected PDI defects 001, 002, and 003 with explicit policy and integration
  tests while retaining defect 004 for the workflow-engine phase.
- Preserved legacy models and current runtime compatibility paths.

### Phase 2 - Modular Monorepo Foundation

- Moved the existing MDR application to `apps/mdr-web` with all routes intact.
- Added truthful approval, verification, API, and worker foundation units.
- Added eight meaningful `@dtg/*` packages and compatibility exports.
- Added workspace-cycle, import-boundary, route-inventory, operational endpoint,
  worker lifecycle, and root-orchestration tests.
- Preserved the Prisma schema and sole existing migration without model changes.
- Recorded `MDR-DEFECT-004` without changing workflow behavior.

### Phase 1.5 - Database-Backed Characterization Closure

- Added pinned, disposable PostgreSQL 17.10 test lifecycle tooling.
- Converted all seven skipped database areas into executable integration tests.
- Added synthetic database fixture factories and safe cleanup.
- Added a narrow transmittal delivery-adapter seam for external-free tests.
- Recorded three stable known-behavior defect IDs.
- Reached 65 passing tests with zero failures and zero skips.

### Phase 1 - Characterization Tests

- Added non-interactive unit, characterization, integration, and CI test commands.
- Added deterministic coverage for numbering, PDI, workflow, review codes, client replies, revisions, transmittal policies, read models, authorization, and PDF utilities.
- Added sanitized generated Excel and PDF fixtures.
- Added a fail-closed database test safety guard.
- Added narrow PDI and search seams that preserve current runtime behavior.
- Documented characterized defects, integration skips, and the Phase 2 gate.
