# Phase 5 Controlled Google Drive Report

Date: 2026-07-29

## Executive Summary

Phase 5 is CODE_COMPLETE and STAGING_READY. New controlled Main PDFs use Drive
File ID authority, server-side copy, SHA-256, restricted permissions,
tamper-evident reconciliation, and platform-only delivery. Live Google
verification is externally blocked.

## Entry Gate

Phase 4 report and commits passed. Starting commit:
`aba18904b334cee6416f183a8ff989d1706a4ced`.

## Picker

One-time user/project handoffs validate the selected File ID server-side.
Client metadata is ignored. MIME, size, Shared Drive location, owners, access,
and trash state come from the adapter. Responses expose internal IDs only.

## Storage Adapter

The contract covers metadata, streams/ranges, copies, folders, Shared Drives,
permissions, moves, trash detection, resumable upload, and authorized
temporary deletion. Official and deterministic fake adapters are implemented.
No public-link operation exists.

## Controlled Copy

Reservation and `DRIVE_CONTROLLED_COPY` creation are transactional. The worker
claims one job, copies server-to-server under an opaque name, validates bytes,
restricts permissions, records Drive identity, completes the job, emits an
outbox event, and returns the existing verified record on retry.

## Hashing

Controlled bytes are streamed for SHA-256, size verification, and PDF page
count. Expected and observed values are persisted in integrity checks.

## One-Main-File

The existing partial unique index rejects a second active Main File per
revision. The service also rejects replacement after a lock or approval cycle.
Verified revision/source/file identity is database-immutable.

## Folder Routing

Versioned rules use stable tokens and sanitized display values. Preview is
available without Drive writes. Historical File IDs and folder snapshots remain
unchanged when display names or routing rules change.

## Permissions

Only approved administrative principals receive direct Drive grants. Public,
domain, and unknown grants are detected and removable. Ordinary users receive
audited platform streams with safe headers and no raw Drive link.

## Tamper Detection

Reconciliation detects permission drift, missing/trashed files, size mismatch,
and SHA-256 mismatch. It creates issues and security outbox alerts and moves the
Main File out of `Verified`, which blocks delivery.

## Uploads

Upload sessions are idempotent, expiring, chunked, resumable, checksum-checked,
contiguous, full-hash verified, malware-adapter gated, and completed through a
restricted resumable Drive upload. Temporary parts remain isolated.

## Legacy Compatibility

Supabase reads remain available. Inventory is dry-run only. No migration or
deletion is silent, automatic, or claimed safe without operational inventory.

## Test Results

The complete local gate passed on 2026-07-29:

- 115 tests passed.
- 0 tests failed, skipped, cancelled, or marked todo.
- Fresh and upgrade PostgreSQL migrations passed in the disposable lifecycle.
- Unit, architecture, and database-backed characterization suites passed.
- Workspace lint, type checking, documentation validation, and builds passed.
- The MDR production build passed with the Phase 5 routes.
- `git diff --check` and the repository secret-pattern scan passed.

Unit tests cover Picker, metadata, routes, permissions, ranges, fake
copy/move/rename, uploads, and worker dispatch. Database integration covers
copy, idempotency, one-file constraint, delivery, audit, permission drift,
automatic unauthorized-grant removal, and integrity blocking.

## Live Google Verification

`BLOCKED_EXTERNAL_CREDENTIALS`

No approved dedicated Drive, folder, OAuth Picker configuration, or service
credentials are available. No live call or production deployment occurred.

## External Blockers

- Owner-provisioned restricted Shared Drive/root.
- Approved service identity and administrative principals.
- Picker OAuth configuration and staging origins.
- Staging permission, large-file, and incident-response verification.

## Phase 6 Readiness

READY. Document generation may consume the verified internal file-delivery
contract but must not bypass integrity status.

## Commit

`b6e675a61c4fade195fd72f7d6a85e87267b20ba`

## Working Tree

Clean after implementation and report finalization commits.
