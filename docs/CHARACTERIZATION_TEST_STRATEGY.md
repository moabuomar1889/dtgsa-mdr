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

Transaction-heavy behavior remains represented by explicit integration-test skips until a safe database is supplied.

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

Database-backed integration cases are listed in the integration suite and skipped when:

```text
TEST_DATABASE_URL
```

is absent. If supplied, the safety guard validates the database name and host before any future connection is allowed.

## Database Safety

The guard in:

```text
tests/helpers/database-safety.ts
```

fails closed unless:

- The URL is explicitly provided as the test database URL.
- The database name contains a standalone test marker.
- The database name is not production-like.
- The host is local or explicitly listed in the approved test-host variable.

The test suite does not run migrations, reset schemas, or connect to PostgreSQL in ordinary Phase 1 execution.

## External Integration Strategy

Ordinary tests do not call:

- Supabase Auth or Storage.
- Google Drive or Google Workspace.
- SMTP or Resend.
- LibreOffice.
- Coolify.
- Production PostgreSQL.

Current deterministic policy seams are exercised directly. Delivery, storage, and database transaction behavior remains an integration gap rather than being simulated inaccurately.

## Fixture Policy

All fixture content is generated locally and contains no confidential company data.

- Excel fixtures contain a sanitized example PDI row.
- PDF fixtures generate small valid pages in memory.
- No production exports, documents, signatures, credentials, or customer records are used.

## Production Seams

Three narrow behavior-preserving seams were added:

- PDI workbook read/write and normalization helpers.
- PDI sent-status and duplicate-promotion decisions.
- Search normalization and the current empty-result shape.

The runtime services call these helpers, preserving current outputs and error messages.

## Known Untestable Areas

Without an approved disposable database, the suite does not execute:

- Numbering sequence allocation concurrency and rollback.
- PDI creation, database status updates, promotion transaction, or rollback.
- Workflow action and signature-event transactions.
- Client-reply audit writes and revision transaction lineage.
- Transmittal writes, notifications, delivery, and document status updates.
- Database-backed search, dashboard, task, and report queries.

## Known Coverage Gaps

- PDI import currently accepts arbitrary text as an empty workbook; this is characterized as a likely defect.
- PDI promotion currently has no status eligibility guard beyond duplicate promotion prevention.
- Large PDF performance and 100 MB files are deferred.
- Real browser, Supabase, Drive, email, LibreOffice, and deployment behavior is not exercised.
- Authorization tests protect role vocabulary and representative project scoping, not live Supabase sessions.

## Future Migration Use

These tests are the parity gate for future extraction. When a policy moves into a package, its existing tests should move with it unchanged first. Target behavior may be changed only through an approved decision that updates both the implementation and the characterization expectation.
