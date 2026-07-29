# Current State

Date: 2026-07-29
Repository: moabuomar1889/dtgsa-mdr
Branch: codex/dtg-signature-platform-merge
Baseline commit: 05eb730a8f7e735a1254c1d1ba7e3133775d5ddc

## Product Baseline

The repository is a working full-stack MDR and Document Control application. It already implements useful PDI, MDR, numbering, revision, file upload, cover generation, workflow, transmittal, client reply, search, reporting, notification, and audit concepts.

The target product is DTG Signature Platform, delivered through staged modernization rather than a greenfield rewrite.

## Authoritative Workspace

The active implementation workspace is:

```text
C:\Users\moabu\Documents\Codex\Projects\dtgsa-mdr
```

The following obsolete clone is explicitly non-authoritative and must never be used:

```text
G:\My Drive\test\dtgsa-mdr
```

It was removed on 2026-07-29 at the owner's request.

The active workspace also contains the required merge-readiness report:

```text
docs/MDR_CODE_MERGE_REPORT.md
```

## Technology Baseline

- Next.js 16.2.1
- React 19.2.4
- TypeScript 5.9.3
- Prisma 7.6.0
- PostgreSQL through `pg` and `@prisma/adapter-pg`
- Supabase SSR/Auth/Storage libraries
- Google APIs library
- PDF processing through `pdf-lib`
- DOCX templating through `docxtemplater` and `pizzip`
- Excel import/export through `xlsx`
- Validation through Zod

## Current Routes

- `/`
- `/_not-found`
- `/admin/users`
- `/api/pdi/export`
- `/audit`
- `/clients`
- `/dashboard`
- `/masters`
- `/mdr`
- `/notifications`
- `/pdf-tools`
- `/pdi`
- `/portal`
- `/portal/pdi`
- `/profile`
- `/projects`
- `/projects/[projectId]`
- `/projects/new`
- `/replies`
- `/reports`
- `/search`
- `/settings`
- `/sign-in`
- `/tasks`
- `/templates`
- `/transmittals`

## Prisma Baseline

- Enums: 22
- Models: 42
- Migration directories: 1

Migration:

```text
20260329143000_init_foundation
```

Important existing models include:

- `User`
- `Role`
- `Permission`
- `SignatureProfile`
- `SignatureEvent`
- `Client`
- `Project`
- `ReviewCode`
- `NumberingRule`
- `PdiRegister`
- `PdiItem`
- `MdrDocument`
- `DocumentRevision`
- `DocumentFile`
- `WorkflowStep`
- `WorkflowAction`
- `CoverSheetTemplate`
- `GeneratedDocument`
- `Transmittal`
- `ClientReply`
- `DriveMapping`
- `Notification`
- `AuditLog`

## Validation Baseline

Passed:

```text
.\node_modules\.bin\eslint.cmd .
```

Passed:

```text
.\node_modules\.bin\prisma.cmd validate
```

Passed:

```text
.\node_modules\.bin\next.cmd build --experimental-build-mode compile
```

Passed:

```text
.\node_modules\.bin\next.cmd build
```

Available after Phase 1.5:

```text
pnpm test
pnpm test:unit
pnpm test:characterization
pnpm test:integration
pnpm test:ci
pnpm test:db:migrate
pnpm test:db:clean
```

The Phase 1.5 suite contains 65 tests: 65 pass, 0 fail, and 0 skip. The seven database-backed areas run against disposable PostgreSQL 17.10 on loopback, after applying the existing migration to an empty database.

## Current Architecture Constraints

- The application is still a single Next.js deployment unit.
- Server actions and services call Prisma directly.
- Supabase Auth remains the current employee sign-in mechanism.
- Supabase Storage remains the current primary file authority.
- Google Drive exists as optional mirror/integration metadata rather than the primary external file reference.
- Workflow orchestration is fixed and hardcoded.
- Signature events do not bind to main-file hash, package hash, workflow snapshot, Google identity, or a central platform seal.
- PDF generation and delivery operations still run in request scope.

## Phase 0 Verdict

The repository is ready for Phase 1 characterization tests. It is not ready for architecture extraction until those tests protect the existing MDR behavior.

## Phase 1 State

Phase 1 added a Node.js and TypeScript characterization-test foundation without adding dependencies or changing the package manager.

Protected deterministic behavior includes numbering, PDI workbook handling, PDI status decisions, workflow guards, review-code precedence, client-reply effects, revision labels, transmittal policies, read-model shape, authorization vocabulary, and PDF utilities.

## Phase 1.5 State

Phase 1.5 completed database-backed characterization for numbering, PDI promotion, workflow persistence, client replies, revision lineage, transmittals, and read models. The runner uses a pinned embedded PostgreSQL 17.10 test service, validates and redacts the generated test URL, applies the existing migration, and removes the database in `finally`.

The three known PDI defects remain intentionally unchanged and are recorded in `docs/KNOWN_BEHAVIORAL_DEFECTS.md`. Phase 2 remains closed pending owner review of `docs/reports/PHASE_1_5_DATABASE_CHARACTERIZATION_REPORT.md`.
