# Characterization Test Strategy

Date: 2026-07-29

Repository: moabuomar1889/dtgsa-mdr

Branch: codex/dtg-signature-platform-merge

## Purpose

Protect the current executable MDR and Document Control behavior before package extraction or target-platform redesign. The tests record what the application does today, including behavior that may later be classified as defective.

## Test Boundaries

Phase 1 covers deterministic behavior in:

- Document-number rendering and sequence scope keys.
- PDI workbook parsing, export shape, normalization, and current lifecycle decisions.
- Fixed workflow status vocabulary, submission guards, signature requirements, and locking.
- Review-code precedence and client-reply effects.
- Revision-label calculation and rejected-file identifiers.
- Transmittal attachment, recipient, and size policies.
- Search normalization and the stable empty-result read model.
- Role expansion and permission checks.
- PDF merge, split, remove, reorder, rotate, stamp, invalid-input, and page-count behavior.

Phase 1.5 adds executable transaction-heavy behavior against an automatically created, disposable local PostgreSQL database.

## Selected Tools

- Node.js built-in test runner.
- Existing `tsx` runtime for TypeScript execution.
- Existing `pdf-lib` and `xlsx` dependencies for sanitized fixtures.
- Node strict assertions.

The decision and alternatives are recorded in:

```text
docs/decisions/ADR-001-characterization-test-foundation.md
```

## Unit And Integration Strategy

Pure unit and characterization tests run on every ordinary test execution. They do not require network access, credentials, or a database.

Database-backed integration cases run through:

```text
scripts/run-database-characterization.mjs
```

The runner creates `TEST_DATABASE_URL` independently, validates it before connecting, copies it explicitly into the child `DATABASE_URL`, applies migrations, runs tests, and deletes the database.

## Database Safety

The guard in:

```text
tests/helpers/database-safety.mjs
```

fails closed unless:

- The URL is explicitly provided as the test database URL.
- The database name contains a standalone test marker.
- The database name is not production-like.
- The host is local or explicitly listed in the approved test-host variable.

The Phase 1.5 integration and CI commands apply migrations only to the generated loopback test database. Reset and cleanup operations fail closed through the same safety guard.

## External Integration Strategy

Ordinary tests do not call:

- Supabase Auth or Storage.
- Google Drive or Google Workspace.
- SMTP or Resend.
- LibreOffice.
- Coolify.
- Production PostgreSQL.

Current deterministic policy seams are exercised directly. Transmittal delivery uses narrow fake adapters; no live email, Drive, signed URL, or storage request is made.

## Fixture Policy

All fixture content is generated locally and contains no confidential company data.

- Excel fixtures contain a sanitized example PDI row.
- PDF fixtures generate small valid pages in memory.
- No production exports, documents, signatures, credentials, or customer records are used.
- Database factories use synthetic `.invalid` identities and deterministic metadata.
- Every database-backed test truncates only the validated disposable database.

## Production Seams

Three narrow behavior-preserving seams were added:

- PDI workbook read/write and normalization helpers.
- PDI sent-status and duplicate-promotion decisions.
- Search normalization and the current empty-result shape.

The runtime services call these helpers, preserving current outputs and error messages.

## Database-Backed Coverage

- Numbering allocation, scope, uniqueness, controlled concurrency, and rollback.
- PDI creation, status writes, promotion, audit, duplicate prevention, and rollback.
- Workflow actions, signatures, transitions, repeated decisions, and rollback.
- Client reply writes, revision lineage, replacement documents, and rollback.
- Transmittal creation, fake delivery, notification, submission, and failure behavior.
- Search, dashboard, task, report, empty-state, and project-scoped read models.

## Known Coverage Gaps

- PDI import currently accepts arbitrary text as an empty workbook; this is characterized as a likely defect.
- PDI promotion currently has no status eligibility guard beyond duplicate promotion prevention.
- Large PDF performance and 100 MB files are deferred.
- Real browser, Supabase, Drive, email, LibreOffice, and deployment behavior is not exercised.
- Authorization tests protect role vocabulary and representative project scoping, not live Supabase sessions.

## Future Migration Use

These tests are the parity gate for future extraction. When a policy moves into a package, its existing tests should move with it unchanged first. Target behavior may be changed only through an approved decision that updates both the implementation and the characterization expectation.
