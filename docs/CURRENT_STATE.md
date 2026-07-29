# Current State

Date: 2026-07-29
Repository: moabuomar1889/dtgsa-mdr
Branch: codex/dtg-signature-platform-merge
Baseline commit: 05eb730a8f7e735a1254c1d1ba7e3133775d5ddc

## Product Baseline

The repository is a working full-stack MDR and Document Control application. It already implements useful PDI, MDR, numbering, revision, file upload, cover generation, workflow, transmittal, client reply, search, reporting, notification, and audit concepts.

The target product is DTG Signature Platform, delivered through staged modernization rather than a greenfield rewrite.

## Local Workspace Note

The active implementation workspace is:

```text
C:\Users\moabu\Documents\Codex\Projects\dtgsa-mdr
```

A second clone exists at:

```text
G:\My Drive\test\dtgsa-mdr
```

That second clone is currently at commit:

```text
1706f0967431c2cee4de6e1158fa6588cc7c2e11
```

The active workspace is ahead at:

```text
05eb730a8f7e735a1254c1d1ba7e3133775d5ddc
```

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

Not available:

```text
package.json test script
```

No test/spec files were found with the current search.

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
