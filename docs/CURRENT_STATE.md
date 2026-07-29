# Current State

Date: 2026-07-30

Repository: `moabuomar1889/dtgsa-mdr`

Branch: `codex/dtg-signature-platform-merge`

## Phase Status

- Phase 16.1: `COMPLETE` / `LOCALLY_VERIFIED`.
- Phase 16L local baseline: `FULL_LOCAL_ACCEPTANCE_COMPLETE`.
- External integrations: `EXTERNAL_INTEGRATIONS_UNVERIFIED`.
- Server deployment: `SERVER_DEPLOYMENT_NOT_STARTED`.
- Owner manual UAT: pending.

## Authoritative Workspace

```text
C:\Users\moabu\Documents\Codex\Projects\dtgsa-mdr
```

The obsolete Google Drive clone is not an authoritative workspace.

## Current Architecture

PostgreSQL is the only application database and Prisma is the only ORM and
migration authority. Internal production identity is Google Workspace OIDC;
local acceptance uses only the synthetic selector; external clients use
PostgreSQL-backed Magic Links. There is no password login or compatibility
authentication mode.

Production file authority is private Google Drive with separate controlled and
source providers. Local acceptance uses controlled, source, and temporary
filesystem providers under `.local-runtime`. Large file bytes are not stored
in PostgreSQL.

The active migration history is:

```text
0001_initial_dtg_signature_platform
```

The pre-consolidation state is retained in Git history and the local annotated
tag `phase-16.1-pre-supabase-removal`.

## Applications

The five independently buildable units are `mdr-web`, `approve-web`,
`verify-web`, `platform-api`, and `worker`. Shared code crosses boundaries only
through public `@dtg/*` packages.

## Local Validation Boundary

Phase 16.1 uses disposable embedded PostgreSQL on loopback, synthetic data,
synthetic identity, and local files only. No VPS, Coolify, DNS, hosted
database, Google tenant, company Drive, or remote storage was contacted.

## External Gates

Approved credentials and a separately authorized staging phase are still
required to verify live Google OAuth, delegated Directory synchronization,
Drive permissions and large-file behavior, external email/webhooks, production
malware scanning, KMS/HSM signing, trusted timestamps, public domains, backup
retention, and deployment. PAdES remains explicitly deferred.

## Authoritative References

- `docs/POSTGRESQL_PRISMA_ONLY_ARCHITECTURE.md`
- `docs/CLEAN_DATABASE_BASELINE.md`
- `docs/AUTHENTICATION_PROVIDERS.md`
- `docs/FILE_STORAGE_PROVIDERS.md`
- `docs/reports/PHASE_16_1_SUPABASE_ELIMINATION_REPORT.md`
