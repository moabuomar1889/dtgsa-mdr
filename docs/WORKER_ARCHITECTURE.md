# Durable Worker Architecture

Date: 2026-07-29

## Boundary

Web applications validate authorization and transactionally enqueue immutable
intent. They do not assemble PDFs, send email, deliver webhooks, copy controlled
files, or mark a transmittal sent. PostgreSQL is the queue and outbox authority;
Redis is intentionally absent because no measured need currently justifies a
second consistency system.

## Lifecycle

`BackgroundJob` has a globally unique idempotency key, correlation ID,
priority, bounded attempts, progress, heartbeat, cancellation request, lease,
retry time, terminal timestamps, structured error, and metrics. A worker claims
one eligible row optimistically, creates a numbered `JobAttempt`, and owns the
row only while its lease remains current. Expired running leases are eligible
for recovery by another worker.

Retryable failures use capped exponential backoff. Non-retryable failures and
exhausted attempts move to `DeadLetter`. Cancellation prevents new claims and
becomes terminal before or after the current handler yields. Graceful shutdown
aborts polling, stops new leases, and waits for the active handler.

## Job Catalog

The registered catalog is:

- `DRIVE_CONTROLLED_COPY`
- `FILE_HASH`
- `PDF_ASSEMBLE_INTERNAL`
- `PDF_ASSEMBLE_CLIENT_RESPONSE`
- `COVER_RENDER`
- `PLATFORM_SEAL`
- `EMAIL_SEND`
- `NOTIFICATION_DISPATCH`
- `TRANSMITTAL_DELIVER`
- `WEBHOOK_DELIVER`
- `MALWARE_SCAN`
- `TEMP_CLEANUP`
- `DRIVE_RECONCILE`
- `ARTIFACT_CLEANUP`

Every enqueue operation requires an idempotency key. Provider-specific handlers
fail closed when their approved deployment adapter or credentials are absent.
PDF assembly, hashing, malware test-signature rejection, notification dispatch,
temporary cleanup, and artifact cleanup have built-in handlers. Existing Drive,
cover, seal, email, transmittal, webhook, and reconciliation implementations
are reached only through their job contracts during deployment integration.

## Operations

Queue workers are horizontally scalable because ownership is database-enforced.
Structured logs include application, event, worker, job, correlation, document,
duration, bytes, and error code where available. Payloads and logs must never
contain access tokens, private keys, webhook secrets, or raw session tokens.
