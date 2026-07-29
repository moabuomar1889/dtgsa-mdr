# Worker Observability

Date: 2026-07-29

## Metrics

- Queue depth by job type and priority.
- Running jobs and stale leases.
- Job duration and attempt count.
- Retry, failed, canceled, and dead-letter totals.
- PDF assembly duration and bytes processed.
- Artifact cache hit ratio.
- Drive, email, webhook, and malware-provider errors.
- Temporary and artifact cleanup failures.
- Outbox lag and unprocessed event count.

`DurableJobStore.metrics()` provides queue depth, running, retry, failed,
dead-letter, and canceled snapshots. Completed jobs persist handler metrics,
including bytes and duration. Delivery attempts and webhook rows preserve
provider outcomes for operational dashboards.

## Logs and Alerts

Logs are structured JSON. Allowed identifiers are job ID, correlation ID,
document/revision ID, event type, provider class, status, duration, and byte
count. Secrets, authorization headers, recipient addresses, private Drive IDs,
raw payloads, and database credentials are prohibited.

Alert on growing queue depth, oldest pending age, stale leases, any dead letter,
cleanup failure, integrity/tamper error, repeated provider failure, and storage
quota pressure. Operators follow `docs/runbooks/WORKER_OPERATIONS.md`.
