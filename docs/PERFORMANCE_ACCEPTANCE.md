# Performance Acceptance

Date: 2026-07-29

## Acceptance Matrix

| Scenario                      | Result                | Limit or evidence                                              |
| ----------------------------- | --------------------- | -------------------------------------------------------------- |
| 100 MiB PDF viewer first page | COMPLETE locally      | One 1 MiB range, under 1% of fixture                           |
| 500 MiB PDF                   | BLOCKED_EXTERNAL      | Requires approved staging corpus and capacity                  |
| HTTP range requests           | COMPLETE locally      | 1 MiB ranges, private no-store delivery                        |
| Hashing                       | COMPLETE functionally | Streaming SHA-256; live throughput benchmark pending           |
| Controlled copy               | COMPLETE functionally | Idempotent stream/copy/hash contract                           |
| Cover rendering               | COMPLETE locally      | Deterministic renderer and snapshots                           |
| Signed download assembly      | PARTIALLY_COMPLETE    | Moderate local inputs pass; qpdf staging required above 32 MiB |
| Concurrent approvers          | PARTIALLY_COMPLETE    | Atomic/idempotent transactions pass; load test pending         |
| Search and dashboard          | PARTIALLY_COMPLETE    | Bounded queries pass; production-volume benchmark pending      |
| Worker throughput             | PARTIALLY_COMPLETE    | Lease/retry/recovery tests pass; sustained load pending        |
| Queue recovery                | COMPLETE locally      | Stale lease, heartbeat, retry, dead-letter tests               |
| Database connections          | PARTIALLY_COMPLETE    | Limits documented; shared staging pool test pending            |
| Memory/CPU/temp disk          | BLOCKED_EXTERNAL      | Container telemetry and large-file profile pending             |

## Operational Limits

- API request body: 1 MiB.
- PDF.js range: 1 MiB.
- Moderate in-process PDF assembly: at most 32 MiB total input.
- Larger PDF assembly: qpdf path only and fail closed when unavailable.
- Temporary artifacts: encrypted, private, expiring, and cleaned by durable job.
- Webhook attempts: eight before dead letter.
- Every service has documented CPU, memory, connection, and temporary-storage
  alerts in the Phase 14 operations documents.

## Staging Benchmark Plan

Run 100 MiB and approved 500 MiB fixtures without confidential data. Capture
first-page latency, total bytes, peak RSS, CPU time, temporary disk, assembly
time, hash throughput, queue depth, connection saturation, and cleanup. Test
concurrent review, search, dashboard, controlled copy, provider retry, stale
lease recovery, and database failover. Store results with build and commit SHA.
