# Phase 16.1 Supabase Elimination Report

Date: 2026-07-30

## 1. Executive Summary

Status: `COMPLETE`.

Active authentication, storage, SDK, configuration, database, UI, and
compatibility dependencies on Supabase have been removed. The platform now has
one PostgreSQL/Prisma persistence authority, approved Google/local identity
boundaries, and Drive/local filesystem storage boundaries.

## 2. Owner Decision

Status: `COMPLETE`.

The owner directed complete removal before operational use. No rollback mode or
dormant active compatibility adapter is retained.

## 3. Confirmation of Local-Only Execution

Status: `COMPLETE`.

All work used the authoritative local workspace, disposable embedded PostgreSQL
on loopback, synthetic identities/data, and `.local-runtime`. No VPS, SSH,
Coolify, DNS, hosted database, Supabase project, Google tenant, company Drive,
or external deployment endpoint was contacted.

## 4. Starting Branch and Commit

Status: `COMPLETE`.

Branch: `codex/dtg-signature-platform-merge`.

Starting commit: `cb81cf0e7c7b3ad8fe134753bf43ff7f8a4f474e`.

## 5. Final Commit

Status: `COMPLETE`.

All implementation and validation work is complete. The implementation commit is
`bca4f74bcd4dc2db6a66e0093df9350161253e5f`.

## 6. Supabase Inventory

Status: `COMPLETE`.

`docs/SUPABASE_ELIMINATION_INVENTORY.md` classifies active runtime,
configuration, tests, compatibility, dead code, lockfile entries, false
positives, and historical documentation before removal.

## 7. Dependencies Removed

Status: `COMPLETE`.

Direct `@supabase/ssr` and `@supabase/supabase-js` dependencies and their
transitive auth, functions, realtime, REST, storage, and websocket packages
were removed from manifests and `pnpm-lock.yaml`.

## 8. Source Files Removed

Status: `COMPLETE`.

Removed browser/server/admin/proxy Supabase clients, client environment helper,
admin auth-user synchronization service, and legacy storage compatibility
service.

## 9. Source Files Replaced

Status: `COMPLETE`.

Authentication, proxy/session handling, storage, worker file access, upload,
download, template, signature, PDF, transmittal, reply, dashboard, settings,
environment, and local runtime consumers were replaced with provider-neutral
PostgreSQL/Prisma and Drive/local implementations.

## 10. Authentication Cleanup

Status: `COMPLETE`.

Password login/bootstrap, provider sessions/JWTs, legacy and dual modes, admin
user synchronization, and rollback paths are absent. Production supports
`GOOGLE_WORKSPACE`; local acceptance supports
`LOCAL_ACCEPTANCE_IDENTITY`; external clients use PostgreSQL-backed Magic
Links.

## 11. Storage Cleanup

Status: `COMPLETE`.

Bucket operations, object paths, signed URLs, compatibility reads, fallback,
and provider REST calls are absent. Active providers are controlled/source
Drive and controlled/source/temporary local filesystem.

## 12. Prisma Schema Cleanup

Status: `COMPLETE`.

Provider-specific identity, bucket/path, auth mode, and storage enum concepts
were removed. Generic storage provider/key pairs, hashes, immutable file
identity, domain records, evidence, and audit models remain.

## 13. Models Removed

Status: `NOT_APPLICABLE`.

No domain model was provider-exclusive. Confirmed MDR/PDI/workflow/evidence
models were preserved; provider-specific behavior was removed from fields and
services.

## 14. Fields Removed

Status: `COMPLETE`.

Removed `User.authUserId`, signature bucket/path fields, document bucket/path
fields, template/generated-document bucket/path fields, and provider-specific
Drive mirror columns that duplicated generic provider identity. Generic
provider keys replaced active file references.

## 15. Enums Removed

Status: `COMPLETE`.

Removed legacy and dual authentication values and the Supabase storage-provider
value. The active storage enum contains only the five approved Drive/local
providers.

## 16. Environment Variables Removed

Status: `COMPLETE`.

Supabase URL, browser key, service-role key, JWT secret, bucket, auth-mode, and
compatibility variables were removed from schemas, examples, tests, local
runtime, and documentation. Persistence uses database role URLs; storage uses
Drive or local provider configuration.

## 17. UI Cleanup

Status: `COMPLETE`.

Password login, bootstrap administration, auth-user synchronization, provider
storage/bucket status, and setup prompts were removed. Sign-in now starts
Google OIDC or displays only the clearly local synthetic selector.

## 18. Clean PostgreSQL Architecture

Status: `COMPLETE`.

PostgreSQL is the only application database and Prisma is the only ORM and
migration authority. Large files remain in Drive/local providers. See
`docs/POSTGRESQL_PRISMA_ONLY_ARCHITECTURE.md`.

## 19. Consolidated Migration

Status: `COMPLETE`.

The active history is
`prisma/migrations/0001_initial_dtg_signature_platform/migration.sql`. Prior
migrations remain in Git history and a local annotated safety tag records the
pre-removal commit.

## 20. Migration SQL Review

Status: `COMPLETE`.

The generated SQL was manually reviewed. It contains the final schema plus
required checks, partial unique indexes, immutable-version triggers,
append-only evidence/audit triggers, controlled-file identity checks, session
expiry constraints, and upload/review bounds. It contains no Supabase schema,
policy, function, extension, identity table, storage table, or provider value.

## 21. Database Role Results

Status: `COMPLETE`.

Role templates define `dtg_signature_migrate`, `dtg_signature_runtime`,
`dtg_signature_readonly`, and `dtg_signature_backup` with secure search paths
and without application superuser, role-creation, database-creation, or runtime
schema-change privileges.

## 22. Empty Database Result

Status: `COMPLETE`.

The clean baseline applied successfully to a new disposable PostgreSQL 17.10
database on loopback.

## 23. Seed Result

Status: `COMPLETE`.

Disposable migration plus idempotent synthetic seed passed. The clean local
runtime setup and explicit `local:seed` command also completed successfully.

## 24. Backup Result

Status: `COMPLETE`.

`pnpm local:backup-restore` created an AES-256-GCM encrypted local backup from a
repeatable-read, read-only source transaction. The final standalone run covered
147 tables and 185 rows.

## 25. Restore Result

Status: `COMPLETE`.

The clean migration applied to the isolated `dtgsa_local_restore` database and
the backup restored successfully. The restored database was removed afterward.

## 26. Post-Restore Verification

Status: `COMPLETE`.

All 11 selected domain-table comparisons matched, including users, roles,
clients, projects, PDI, MDR, revisions, audit, jobs, response codes, and General
Requests. Final local RPO was 0 seconds and measured RTO was 1,969 ms.

## 27. No-Supabase Gate Result

Status: `COMPLETE`.

`pnpm check:no-supabase` passes for active applications, packages, Prisma,
scripts, tests, config, infrastructure, CI, manifests, lockfile, and environment
examples. The command is enforced in CI.

## 28. Package Audit

Status: `COMPLETE`.

Frozen installation and supply-chain policy verification pass for 974 lockfile
entries. `pnpm audit --audit-level high` exits successfully with no high or
critical findings; it reports 3 low and 8 moderate advisories. The newly
published high `brace-expansion` advisory is remediated with 5.0.8 plus a
reproducible one-line `minimatch@3.1.5` compatibility patch.

## 29. Bundle Audit

Status: `COMPLETE`.

After the final production build, browser static bundles and Next.js server
bundles contain no retired SDK import, public environment name, legacy mode, or
provider identifier.

## 30. Network Audit

Status: `COMPLETE`.

Playwright captured all browser requests and found zero non-loopback requests.
The CSP omits generic HTTPS from `connect-src`, all health requests target
127.0.0.1, and the acceptance artifact records
`externalProvidersContacted=false`.

## 31. Automated Test Inventory

Status: `COMPLETE`.

The suite covers unit, characterization, architecture, database-backed
integration, clean migration/seed, five application boundaries, Playwright
browser workflows, qpdf large files, backup/restore, provider gates, and full
local acceptance.

## 32. Exact Test Results

Status: `COMPLETE`.

Focused unit result: 135 passed. `pnpm test`: 204 passed. `pnpm test:ci`: 204
passed. Every run had 0 failed, 0 cancelled, 0 skipped, and 0 TODO tests.

## 33. Browser Test Results

Status: `COMPLETE`.

The standalone Playwright command passed 2 of 2 tests using one worker. The
aggregate acceptance runner independently passed the same 2 tests with zero
unexpected results.

## 34. Local Acceptance Result

Status: `COMPLETE`.

`local:clean`, guarded local reset, `local:setup`, `local:seed`, `local:demo`,
`local:status`, `local:acceptance`, standalone Playwright, `local:qpdf`,
`local:backup-restore`, and `local:down` completed. Four local-provider tests,
two browser tests, seven qpdf scenarios, 20 concurrent dashboard requests, and
backup/restore passed. Services were stopped with synthetic data preserved.

## 35. Build Results

Status: `COMPLETE`.

All workspace type checks pass. Production builds pass for `mdr-web`,
`approve-web`, `verify-web`, `platform-api`, and `worker`, along with all shared
packages.

## 36. Prisma Validation

Status: `COMPLETE`.

Prisma format, validation, client generation, disposable clean migration, and
baseline-plus-idempotent-seed upgrade checks pass.

## 37. Documentation Validation

Status: `COMPLETE`.

`pnpm docs:validate` passes every Phase 2 through Phase 16.1 validator. The
Phase 16.1 validator confirms the architecture, ADRs, inventory, and all 45
report sections.

## 38. Remaining Legacy References

Status: `HISTORICAL_ONLY`.

No reference remains in active source, configuration, schema, tests,
infrastructure, CI, manifests, lockfile, or environment examples. Historical
plans, audits, reports, and prompts retain truthful descriptions.

## 39. Permitted Historical References

Status: `HISTORICAL_ONLY`.

Phase reports, Graphify snapshots, characterization strategy, original merge
audit, migration/retirement decision records, implementation plans, and prompts
describe the former state. Operational transition documents are explicitly
marked historical and point to current architecture.

## 40. Known Limitations

Status: `PARTIALLY_COMPLETE`.

Owner manual UAT is pending. PAdES is deferred. Live OAuth, Directory, Drive,
email/webhook, malware, KMS/HSM, timestamp, public-domain, backup-retention, and
deployment behavior cannot be proven in this local-only phase. The dependency
audit retains 3 low and 8 moderate advisories, with no high or critical finding.

## 41. External Integration Status

Status: `EXTERNAL_INTEGRATIONS_UNVERIFIED`.

No real external credential or endpoint was used.

## 42. Server Deployment Status

Status: `SERVER_DEPLOYMENT_NOT_STARTED`.

No server, container platform, DNS, or production configuration was modified.

## 43. Final Architecture Verdict

Status: `COMPLETE`.

The active platform is PostgreSQL/Prisma-only persistence with approved
Google/local identity and Drive/local file providers. All required local
validation is complete; external integrations and deployment remain separate
gates.

## 44. Git Status

Status: `COMPLETE`.

All intended changes pass `git diff --check`. After the implementation commit,
only this evidence report remained, and it is isolated in the documentation
follow-up commit.

## 45. Final Commit SHA

Status: `COMPLETE`.

The final validated implementation commit is
`bca4f74bcd4dc2db6a66e0093df9350161253e5f`. This report is delivered in a
documentation-only follow-up commit so the implementation SHA remains exact and
auditable.
