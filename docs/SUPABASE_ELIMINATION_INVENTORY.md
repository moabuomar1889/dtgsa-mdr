# Supabase Elimination Inventory

Date: 2026-07-30

Baseline branch: `codex/dtg-signature-platform-merge`

Pre-removal commit: `cb81cf0e7c7b3ad8fe134753bf43ff7f8a4f474e`

Safety boundary: this inventory was produced from repository text and the
loopback-only local workspace. No Supabase, Google, VPS, staging, production,
DNS, or deployment endpoint was contacted.

## Classification Summary

| Classification             | Finding                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACTIVE_RUNTIME`           | Supabase Auth, SSR cookies, password login/bootstrap, admin user sync, Storage upload/download/delete/signed URLs, worker reads, and legacy fallback logic |
| `ACTIVE_CONFIGURATION`     | SDK dependencies, environment schemas/examples, auth modes, storage buckets, dashboard/settings indicators, and local/test synthetic Supabase variables    |
| `ACTIVE_TEST`              | Phase 4 tests explicitly permit legacy and dual auth modes; database fixtures use legacy storage fields                                                    |
| `LEGACY_COMPATIBILITY`     | Legacy storage reader/inventory, legacy auth mode, dual transition mode, `User.authUserId`, bucket/path columns, and Supabase provider enum value          |
| `HISTORICAL_DOCUMENTATION` | Earlier phase reports and merge/audit documents truthfully describe the former Supabase baseline                                                           |
| `LOCKFILE_ONLY`            | Supabase transitive packages beneath the two direct MDR dependencies                                                                                       |
| `FALSE_POSITIVE`           | A denied-host safety literal in the local provider guard; it is still removed so the active zero-Supabase gate can remain exception-free                   |
| `DEAD_CODE`                | Browser client and client environment helper have no non-Supabase purpose after removal                                                                    |

## Active Dependencies

`apps/mdr-web/package.json` directly depends on:

- `@supabase/ssr`
- `@supabase/supabase-js`

`pnpm-lock.yaml` consequently contains:

- `@supabase/auth-js`
- `@supabase/functions-js`
- `@supabase/phoenix`
- `@supabase/postgrest-js`
- `@supabase/realtime-js`
- `@supabase/ssr`
- `@supabase/storage-js`
- `@supabase/supabase-js`

## Active Authentication Runtime

| File                                                                       | Classification   | Use                                                    |
| -------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------ |
| `apps/mdr-web/proxy.ts`                                                    | `ACTIVE_RUNTIME` | Supabase SSR session refresh and legacy fallback       |
| `apps/mdr-web/src/lib/supabase/admin.ts`                                   | `ACTIVE_RUNTIME` | service-role Auth and Storage client                   |
| `apps/mdr-web/src/lib/supabase/client.ts`                                  | `DEAD_CODE`      | browser client constructor                             |
| `apps/mdr-web/src/lib/supabase/proxy.ts`                                   | `ACTIVE_RUNTIME` | SSR cookies and `auth.getUser()`                       |
| `apps/mdr-web/src/lib/supabase/server.ts`                                  | `ACTIVE_RUNTIME` | server cookie client                                   |
| `apps/mdr-web/src/lib/config/env-client.ts`                                | `DEAD_CODE`      | browser Supabase URL/key parsing                       |
| `apps/mdr-web/src/server/services/auth/auth-service.ts`                    | `ACTIVE_RUNTIME` | password bootstrap/login/logout and legacy user upsert |
| `apps/mdr-web/src/server/services/admin/user-sync-service.ts`              | `ACTIVE_RUNTIME` | Supabase Auth admin user synchronization               |
| `apps/mdr-web/src/server/actions/platform-admin.ts`                        | `ACTIVE_RUNTIME` | exposes Supabase user sync action                      |
| `apps/mdr-web/src/app/(app)/admin/users/page.tsx`                          | `ACTIVE_RUNTIME` | exposes Supabase sync control                          |
| `apps/mdr-web/src/app/(auth)/sign-in/page.tsx`                             | `ACTIVE_RUNTIME` | legacy/password sign-in presentation                   |
| `apps/mdr-web/src/server/services/signatures/signature-profile-service.ts` | `ACTIVE_RUNTIME` | writes signature metadata into Supabase Auth           |
| `packages/identity-domain/src/index.ts`                                    | `ACTIVE_RUNTIME` | legacy and dual authentication modes                   |

## Active Storage Runtime

| File                                                                         | Classification         | Use                                                     |
| ---------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------- |
| `apps/mdr-web/src/server/services/storage/storage-service.ts`                | `ACTIVE_RUNTIME`       | bucket upload/download/delete and signed URL operations |
| `apps/mdr-web/src/server/services/drive/legacy-storage-compatibility.ts`     | `LEGACY_COMPATIBILITY` | Supabase object inventory and fallback reads            |
| `apps/mdr-web/src/server/services/drive/resumable-upload-service.ts`         | `ACTIVE_RUNTIME`       | temporary Supabase staging                              |
| `apps/mdr-web/src/server/services/mdr/document-file-service.ts`              | `ACTIVE_RUNTIME`       | source upload to Supabase                               |
| `apps/mdr-web/src/server/services/mdr/cover-sheet-service.ts`                | `ACTIVE_RUNTIME`       | generated covers, merge output, and signature reads     |
| `apps/mdr-web/src/server/services/pdf/pdf-tools-service.ts`                  | `ACTIVE_RUNTIME`       | temporary PDF input/output storage                      |
| `apps/mdr-web/src/server/services/replies/client-reply-service.ts`           | `ACTIVE_RUNTIME`       | incoming reply files                                    |
| `apps/mdr-web/src/server/services/replies/client-response-service.ts`        | `ACTIVE_RUNTIME`       | response files                                          |
| `apps/mdr-web/src/server/services/replies/client-response-policy-service.ts` | `ACTIVE_RUNTIME`       | response file uploads                                   |
| `apps/mdr-web/src/server/services/templates/template-management-service.ts`  | `ACTIVE_RUNTIME`       | template upload/read                                    |
| `apps/mdr-web/src/server/services/templates/docx-template-service.ts`        | `ACTIVE_RUNTIME`       | Supabase-only template read                             |
| `apps/mdr-web/src/server/services/transmittals/transmittal-service.ts`       | `ACTIVE_RUNTIME`       | generated transmittal upload                            |
| `apps/mdr-web/src/app/api/downloads/artifacts/[artifactId]/route.ts`         | `ACTIVE_RUNTIME`       | temporary artifact download                             |
| `apps/worker/src/handlers.ts`                                                | `ACTIVE_RUNTIME`       | service-role REST reads and temporary artifact storage  |

## Active Configuration and UI

| File                                                             | Classification         | Use                                                        |
| ---------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------- |
| `.env.example`                                                   | `ACTIVE_CONFIGURATION` | Supabase keys, buckets, and legacy auth default            |
| `apps/mdr-web/.env.example`                                      | `ACTIVE_CONFIGURATION` | browser/server Supabase variables                          |
| `apps/mdr-web/src/lib/config/env.ts`                             | `ACTIVE_CONFIGURATION` | requires Supabase URL/key and exposes service-role/buckets |
| `apps/mdr-web/next.config.ts`                                    | `ACTIVE_CONFIGURATION` | Supabase image remote pattern                              |
| `scripts/local/common.mjs`                                       | `ACTIVE_CONFIGURATION` | synthetic Supabase variables and dual auth mode            |
| `scripts/run-database-characterization.mjs`                      | `ACTIVE_CONFIGURATION` | synthetic Supabase variables                               |
| `apps/mdr-web/src/server/services/identity/identity-config.ts`   | `ACTIVE_CONFIGURATION` | dual-mode selection                                        |
| `apps/mdr-web/src/app/local-acceptance/session/route.ts`         | `ACTIVE_CONFIGURATION` | dual-mode audit snapshot                                   |
| `apps/mdr-web/src/app/(app)/dashboard/page.tsx`                  | `ACTIVE_RUNTIME`       | service-role readiness                                     |
| `apps/mdr-web/src/app/(app)/settings/page.tsx`                   | `ACTIVE_RUNTIME`       | service-role status                                        |
| `apps/mdr-web/src/server/services/settings/settings-overview.ts` | `ACTIVE_RUNTIME`       | Supabase integration status                                |
| `apps/mdr-web/src/features/dashboard/data/dashboard-overview.ts` | `ACTIVE_RUNTIME`       | Supabase setup prompts                                     |
| `packages/local-acceptance/src/index.ts`                         | `FALSE_POSITIVE`       | explicit denied-host literal                               |

## Prisma and Migration Compatibility

| Location                                                                    | Classification         | Finding                                                                                                                                              |
| --------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                      | `LEGACY_COMPATIBILITY` | `StorageProvider.Supabase`, `AuthMode` legacy values, `User.authUserId`, signature bucket/path fields, storage bucket/path fields, Supabase defaults |
| `prisma/migrations/20260329143000_init_foundation/migration.sql`            | `LEGACY_COMPATIBILITY` | Supabase provider enum/defaults and compatibility columns                                                                                            |
| `prisma/migrations/20260729133000_phase4_identity_and_access/migration.sql` | `LEGACY_COMPATIBILITY` | legacy and dual auth enum values                                                                                                                     |

The remaining ten additive migrations do not create Supabase schemas,
`auth.users`, `auth.identities`, or `storage.objects`.

## Active Tests

| File                                                         | Classification | Finding                                           |
| ------------------------------------------------------------ | -------------- | ------------------------------------------------- |
| `tests/unit/phase-4-identity-and-access.test.ts`             | `ACTIVE_TEST`  | permits legacy and dual modes in development      |
| `tests/fixtures/database/characterization-fixtures.ts`       | `ACTIVE_TEST`  | legacy signature path fields                      |
| `tests/integration/database-backed-characterization.test.ts` | `ACTIVE_TEST`  | generic provider tests requiring enum replacement |

## Historical Documentation

The following files contain historically truthful Supabase references and must
not be rewritten to pretend the former architecture never existed:

- `docs/MDR_CODE_MERGE_REPORT.md`
- `docs/GRAPHIFY_BASELINE.md`
- `docs/GRAPHIFY_PHASE_2.md`
- `docs/reports/PHASE_1_CHARACTERIZATION_TEST_REPORT.md`
- `docs/reports/PHASE_1_5_DATABASE_CHARACTERIZATION_REPORT.md`
- `docs/reports/PHASE_2_MONOREPO_FOUNDATION_REPORT.md`
- `docs/reports/PHASE_4_IDENTITY_AND_ACCESS_REPORT.md`
- `docs/reports/PHASE_5_CONTROLLED_GOOGLE_DRIVE_REPORT.md`
- `docs/reports/FINAL_MERGE_IMPLEMENTATION_REPORT.md`
- `docs/reports/PHASE_16L_FULL_LOCAL_ACCEPTANCE_REPORT.md`

Active guidance that must be rewritten rather than exempted includes
`docs/CURRENT_STATE.md`, `docs/ENVIRONMENT_VARIABLES.md`,
`docs/IDENTITY_MIGRATION.md`, `docs/LEGACY_STORAGE_MIGRATION.md`,
`docs/LEGACY_PARITY_AND_RETIREMENT.md`, and
`docs/LOCAL_MANUAL_ACCEPTANCE_GUIDE.md`.

## Removal Decision

All `ACTIVE_RUNTIME`, `ACTIVE_CONFIGURATION`, `ACTIVE_TEST`,
`LEGACY_COMPATIBILITY`, `DEAD_CODE`, and `LOCKFILE_ONLY` findings are approved
for removal or provider-neutral replacement in Phase 16.1. Historical reports
remain immutable and are classified `HISTORICAL_ONLY` by the final gate.

## Final Disposition

The active-source gate passes after removal. Both direct SDK dependency-tree
queries return no package, production browser and server bundles contain no
retired provider code or environment names, and repository text search leaves
only historical reports/plans, explicit retirement documentation, and gate
identifiers.
