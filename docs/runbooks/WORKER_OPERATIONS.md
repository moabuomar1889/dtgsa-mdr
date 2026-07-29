# Worker Operations Runbook

Date: 2026-07-29

## Start and Stop

Run `pnpm --filter @dtg/worker start` with the private database, storage, Drive,
email, and HMAC configuration. Readiness becomes true only after runtime start.
Send `SIGTERM` for graceful shutdown; the worker stops claiming jobs and waits
for the active handler.

## Queue Triage

1. Inspect queue depth, oldest pending job, stale leases, and dead letters.
2. Correlate with structured logs using job and correlation ID.
3. Verify provider health without printing credentials.
4. For a retryable provider outage, leave the row for backoff or move
   `nextAttemptAt` under an approved operational procedure.
5. For invalid payload, authorization, tamper, or corrupt PDF, do not retry;
   correct the authoritative source and enqueue a new idempotency version.
6. Never mark a transmittal sent or a delivery completed manually without
   provider evidence.

## Cleanup

Run or enqueue `TEMP_CLEANUP` and `ARTIFACT_CLEANUP`. Investigate
`CleanupFailed`, private-bucket quota, and files older than TTL. Deleting a
temporary artifact must not alter manifests, controlled Main files, generated
covers, approval evidence, or audit history.

## Dead-Letter Replay

Confirm root cause, preserve the old attempt/error history, increment the
idempotency version, and enqueue a new job. Do not change a dead-letter row into
completed. Email and webhook replays require checking provider message ID first
to avoid duplicate external effects.
