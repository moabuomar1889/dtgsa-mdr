# Operations Runbook

Daily: check app readiness, queue/dead letters, backup success, disk, database
connections, Drive reconciliation, tamper alerts, and certificate expiry.
Weekly: review failed deliveries, auth anomalies, dependency advisories, and
capacity. Monthly: rotate eligible service credentials, patch base images, test
a sampled restore, and review access.

Release: confirm CI commit, backup, schema status, migration lock, deploy,
smoke, queue health, and report. Incident: preserve correlation IDs and audit,
contain credentials/traffic, recover, verify evidence hashes, then document.
Never use `migrate dev`, reset, truncate, or public database access in
production.
