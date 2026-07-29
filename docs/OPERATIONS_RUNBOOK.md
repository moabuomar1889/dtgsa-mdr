# Operations Runbook

## Routine Checks

Daily: application readiness, PostgreSQL connectivity, migration status, queue
leases/dead letters, backup success, disk, Drive reconciliation, tamper alerts,
and certificate expiry.

Weekly: failed deliveries, authentication anomalies, dependency advisories,
role grants, storage permission drift, and capacity.

Monthly: rotate eligible credentials, patch base images, test a sampled
restore, review access, and validate the no-retired-provider gate.

## Release

Confirm CI commit, owner authorization, backup, schema status, migration lock,
five image digests, health/readiness, workflow smoke, queue health, and report.
Use only `prisma migrate deploy`; never use `migrate dev`, reset, truncate, or
public database access in production.

## Incident

Preserve correlation IDs and append-only audit evidence. Contain affected
credentials or traffic, revoke sessions where needed, validate PostgreSQL and
Drive hashes, recover from approved backups, verify workflows, and document the
event. Never expose database URLs, private keys, provider keys, or file paths in
logs or tickets.

## Local Operations

Use `pnpm local:status` for loopback service state and `pnpm local:down` to stop
while preserving data. `pnpm local:clean` is allowed only for the validated
ignored `.local-runtime` directory.
