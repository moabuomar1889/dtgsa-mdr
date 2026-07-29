# Phase 14 DevOps and Operations Report

Date: 2026-07-29

## Verdict

Phase 14 code and configuration are complete and locally verified. Deployment
is **not performed**. Docker is absent locally, and no owner authorization,
Coolify access, staging database, DNS access, backup destination, or production
credentials were supplied.

## Containers and Coolify

Five version-pinned, multi-stage, non-root deployment definitions exist for
MDR, Approve, Verify, API, and Worker. Next.js uses standalone output. Health
checks, graceful process execution, SBOM/provenance CI, private networking,
resource guardrails, read-only filesystem policy, and bounded temp mounts are
documented. One shared project database is specified with no public port.

Domains are prepared for `approve.dtgapps.cc`, `verify.dtgapps.cc`, and the
configured MDR origin. API and worker are private by default.

## Database and CI

The production migration runner requires a verified pre-migration backup,
holds a PostgreSQL advisory lock, uses `prisma migrate deploy`, blocks on
failure, and releases the lock in `finally`. Migration/runtime/read-only/backup
role separation, connection limits, forward-fix rollback, branch protection,
quality gates, dependency audit, container matrix, SBOM, and provenance are
documented.

## Monitoring and Logging

Alert rules cover service health, API errors, dead letters, backup age, and
PostgreSQL saturation. Runbooks add host/container/disk/TLS, queue, Drive,
tamper, delivery, authentication, and temp-storage monitoring. Metrics avoid
confidential labels; logs require structured correlation and redact secrets,
tokens, signed URLs, content, signatures, Drive IDs, and unnecessary PII.

## Backup, Restore, and Recovery

Backup scripts use custom PostgreSQL dumps, age encryption, SHA-256 integrity,
off-site retention, and decrypted catalog validation. Restore verifies the
sidecar, refuses production-like targets without explicit approval, restores
with exit-on-error, and validates manifest presence.

RPO is 24 hours and RTO 8 hours initially. Recovery procedures cover VPS,
PostgreSQL, Drive, signing, identity, workers, domains, secrets, and keys.
Local disposable migration/upgrade passed. A live staging backup/restore and
post-restore evidence verification remain blocked by missing environment and
authorization.

## Test Evidence

- Phase 14 static operations scenarios: 4 passed.
- Lint and full workspace typecheck passed.
- Existing sequential workspace builds and 188-test repository gate passed at
  the Phase 13 boundary.
- All 12 migrations passed empty and sequential upgrade checks.
- Docker image execution: `BLOCKED_TOOLING` because Docker is not installed.
- TLS, port scan, load, large live files, external backups, and staging smoke:
  `BLOCKED_EXTERNAL_ENVIRONMENT`.
- Production deployment: `NOT_AUTHORIZED_NOT_ATTEMPTED`.
- Graphify update: 3,679 nodes, 6,658 edges, 357 communities.

## Security and Secrets

No secret is embedded in Git or images. Coolify and protected GitHub
environments own runtime/deployment secrets. Production database, Google,
Drive, signing, Coolify, DNS, and backup changes all require explicit owner
approval. No public PostgreSQL is configured.

## Phase 15 Readiness

Ready for code-level consolidation and acceptance. Phase 15 must classify live
container, staging restore, TLS, load, and deployment gates as blocked external
until an authorized environment is provided; it must not report production
acceptance.
