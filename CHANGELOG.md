# Changelog

## Unreleased

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
