# Phase 10 Downloads and Worker Report

Date: 2026-07-29

## Verdict

Phase 10 is code-complete and locally verified for the durable PostgreSQL job
engine, request-scope removal, moderate PDF assembly, private artifact
delivery, cleanup, idempotency, and migration behavior. Live provider adapters
and qpdf large-file execution remain staging gates.

## Durable Engine

Fourteen job types share database leases, heartbeat, stale recovery, progress,
cancellation, bounded attempts, exponential backoff, dead letter, correlation,
idempotency, attempts, metrics, and graceful shutdown. PostgreSQL remains the
only queue authority.

## Download Assembly

Signed Internally uses one package/profile cache key and exact cover, Main PDF,
and attachment order. Authorization and integrity are checked before enqueue
and download. The worker verifies every component hash, uses an encrypted
temporary workspace, writes one private non-authoritative artifact, stores its
SHA-256, size, engine, requester, scope, duration, bytes, TTL, and cleanup
state, and never duplicates the Main PDF permanently or per signer.

## PDF Engine and Large Files

`pdf-lib@1.17.1` handles moderate inputs. The 100 MiB policy path selects qpdf
with shell-free arguments and rejects execution when qpdf is unavailable.
This workstation has no qpdf binary, so the local result is safe rejection, not
an unverified memory claim. Staging must install qpdf and run the real 100 MiB
time/RSS benchmark before enabling that class.

## Transmittal and Delivery

The user request now queues idempotently and leaves status `ReadyToSend`.
Delivery success remains a worker-owned policy boundary. Outbox, delivery
attempt, provider response, job attempt, and audit records preserve retries and
external evidence. The synchronous implementation remains compatibility-only.

## Verification Metrics

- Unit tests: 95 passed, 0 failed.
- Integration tests: 15 passed, 0 failed.
- Complete repository gate: 151 passed, 0 failed, skipped, or canceled.
- Fresh database: 9 additive migrations passed.
- Sequential upgrade database: all 9 additive migrations passed.
- Workspace typecheck, lint, architecture, docs, schema, and production builds passed.
- Job catalog: 14 registered types.
- Signed Internally order test: 3 components in exact order.
- Large-file policy test: 100 MiB selects qpdf; unavailable binary fails closed.
- Implementation commit: `6f766f78f4996d9dde4305744da4c1667aed5e97`.

## Phase 11 Readiness

Ready. Client-response assembly can reuse the job engine, private artifact
contract, package/profile cache key, integrity checks, and revision-scoped
authorization without changing controlled Main PDF authority.
