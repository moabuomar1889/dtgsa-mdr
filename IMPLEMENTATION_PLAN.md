# DTGSA MDR Implementation Plan

Last updated: 2026-03-30
Status: Phase 0 foundation complete, Phase 1 admin/onboarding slice in progress

## Purpose

This is the living implementation plan for the DTGSA document control platform.
It must be updated throughout the project as decisions are finalized, phases are completed,
new constraints appear, or scope is refined.

## Locked Stack

- Next.js latest with App Router
- TypeScript strict mode
- pnpm only
- Prisma ORM
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Google Workspace / Google Drive API
- shadcn/ui only
- Tailwind CSS
- Zod
- React Hook Form
- Server Actions and Route Handlers where appropriate
- pdf-lib
- DOCX templating for cover sheets and transmittals
- LibreOffice headless for DOCX -> PDF conversion
- sharp

## Current Workspace State

- Planning documents and project-control folders have been created and are now being maintained as living artifacts.
- Local runtime has been upgraded to `Node.js 22.22.2` and `pnpm 10.30.3`.
- Next.js App Router scaffold has been created in the workspace root with strict TypeScript, Tailwind CSS, ESLint, Prettier, Prisma 7, and the initial shadcn dashboard shell.
- shadcn has been initialized and the `dashboard-01` shell equivalent has been applied via the official `@shadcn/dashboard-01` registry item because the requested raw blocks URL currently fails in the CLI.
- Supabase SSR auth helper files, Prisma adapter-based client wiring, Google Drive service-account helper scaffolding, and LibreOffice conversion utilities have been added.
- Prisma schema baseline has been authored, validated, and generated successfully.
- Initial SQL migration artifact has been generated locally at `prisma/migrations/20260329143000_init_foundation/migration.sql`.
- Core domain helper modules now exist for workflow status enforcement, token-based numbering generation, and RBAC permission expansion.
- The initial database schema has now been applied to Supabase and the foundation seed has populated roles, permissions, default masters, and a default numbering rule.
- Production build verification passed, and runtime smoke tests for `/dashboard`, `/projects`, and `/projects/new` returned HTTP 200 on the current build.
- Shared Drive discovery pages now exist and compare available Google Drive project folders against projects already linked in the system.
- Phase 1 admin screens are now data-backed for dashboard, clients, masters, settings, users/roles, projects, and project onboarding.
- Client creation, master-data creation, and project creation now write business audit-log entries.
- Project onboarding now supports manual folder mapping as a fallback when Shared Drive discovery is blocked, so implementation does not stop on the Google integration issue.
- Users/roles administration now includes a Supabase-auth sync action so auth users can be pulled into the local domain user table.

## Current Blockers

- Google Shared Drive access is not fully ready yet:
  - direct service-account access to the provided Shared Drive returned `Shared drive not found`
  - impersonation returned `unauthorized_client`, which indicates domain-wide delegation is not fully configured for the requested scopes
- Practical meaning of the Google blocker:
  - the service account key is valid and can call Google APIs
  - but the service account cannot currently see the configured Shared Drive or Projects folder
  - and Workspace impersonation is not authorized yet for this service account
- LibreOffice headless is intentionally deferred to a later implementation slice because it is only required once DOCX -> PDF cover generation begins.
- `prisma migrate dev --create-only` still hits a Supabase/schema-engine issue, so the initial migration is tracked as SQL and was applied through PostgreSQL directly instead of Prisma's schema engine.

## Core Architecture

### Application Layers

1. Presentation layer
   - Next.js App Router pages, layouts, server components, client components, shadcn/ui interfaces
2. Application layer
   - Server actions, route handlers, use-case services, orchestration logic
3. Domain layer
   - Numbering engine, workflow engine, revision engine, template engine, audit rules, permissions rules
4. Infrastructure layer
   - Prisma, Supabase, Google Drive, email provider, storage, PDF and DOCX processing

### Route Groups

- `(auth)` for sign-in, callbacks, password/reset flows
- `(app)` for internal DTGSA application
- `(portal)` for client-facing secure portal workflows such as PDI numbering collaboration

### Data Ownership

- Database is the source of truth for workflow, metadata, statuses, numbering, permissions, and logs.
- Google Drive is file storage and folder mapping, not business logic storage.
- Supabase Storage is used for application-managed files, signatures, temporary generated artifacts, previews, and processing intermediates.

## Stable Domain Decisions

### Settings Hierarchy

1. Global system settings
2. Client settings
3. Project settings

Project settings inherit from client settings by default and can override them selectively.

### Status Dimensions

Status dimensions must remain separate in data design and UI logic:

- `PdiStatus`
- `WorkflowStatus`
- `RevisionStatus`
- `ClientReplyState`
- `ReviewCode`

### Workflow Guardrails

- Prepared, Reviewed, and Approved signatures are required before submission.
- DC cannot send unless the workflow state is `ReadyToSubmit`.
- Locking rules must be enforced in backend logic, not just the UI.

### Numbering Engine

- DTGSA document number is auto-generated.
- Client document number is stored separately.
- Revision is separate from the document number.
- Numbering must support configurable tokenized formats and configurable sequence scopes.

## Phase Plan

### Phase 0

- Upgrade local Node to 22.x
- Scaffold Next.js app with pnpm
- Enable strict TypeScript
- Configure Prisma 7 with adapter-based client setup
- Configure Supabase SSR auth
- Configure Tailwind CSS
- Initialize shadcn/ui
- Apply `dashboard-01` base shell
- Create shared layout foundation
- Create `.env.example`
- Add runtime env validation helpers
- Add lint/format baseline
- Prepare LibreOffice integration and health-check strategy

### Phase 1

- RBAC foundation
- User and signature profiles
- Clients
- Projects
- Settings hierarchy
- Disciplines
- Review code management
- Numbering rule administration
- Audit foundation

### Phase 1 Current Completion Snapshot

- Done:
  - Prisma schema foundation applied and seeded
  - RBAC role and permission seed plus helper expansion
  - Global master-data list/create screens for disciplines, document types, release purposes, and review codes
  - Client list/create screen
  - Project list screen
  - Project onboarding screen with Shared Drive discovery and manual fallback
  - Read-only settings and integration diagnostic screen
  - Read-only users/roles administration screen
  - Business audit-log writes for new client, project, and master-data creation
- Still remaining in Phase 1:
  - real user provisioning and signature profile flows
  - editable settings hierarchy and inheritance resolution UI
  - client-scoped and project-scoped overrides for masters and numbering rules
  - project-level role assignment UI
  - stronger auth enforcement across pages and actions

### Phase 2

- PDI register
- Bulk import/export
- Excel generation
- Client numbering portal
- Secure notification flow
- PDI to MDR promotion

### Phase 3

- MDR document root
- Document revisions
- Upload flow
- Workflow engine
- Signature actions
- Reviewer and approver loops
- DC check queue

### Phase 4

- DOCX cover template engine
- DTGSA cover generation
- Client cover generation
- LibreOffice DOCX -> PDF conversion
- PDF preview and practical PDF tooling
- Final merged package generation

### Phase 5

- Transmittal builder
- Attachment size validation
- Email sending
- Transmittal PDF generation
- Document linkage and submit-to-client workflow

### Phase 6

- Client reply capture
- Review code processing
- Rejected file naming automation
- Revision-vs-new-number branching
- Notifications

### Phase 7

- Advanced Google Drive mapping and uploads
- Reporting
- Overdue dashboards
- Mobile polish
- Resilience and hardening

## Initial Domain Model Direction

### Identity and Permissions

- `User`
- `Role`
- `Permission`
- `UserRole`
- `UserProjectRole`
- `RolePermission`
- `SignatureProfile`
- `SignatureEvent`

### Tenancy and Settings

- `Client`
- `ClientContact`
- `ClientSetting`
- `Project`
- `ProjectContact`
- `ProjectSetting`
- `DriveMapping`

### Master Data

- `Discipline`
- `ClientDiscipline`
- `ProjectDiscipline`
- `DocumentTypeCategory`
- `ReleasePurpose`
- `ReviewCode`

### Numbering

- `NumberingRule`
- `NumberingRuleToken`
- `NumberingSequence`

### Registers and Documents

- `PdiRegister`
- `PdiItem`
- `MdrDocument`
- `DocumentRevision`
- `DocumentFile`
- `GeneratedDocument`

### Workflow and Communication

- `WorkflowStep`
- `WorkflowAction`
- `TransmittalTemplate`
- `CoverSheetTemplate`
- `Transmittal`
- `TransmittalItem`
- `ClientReply`
- `Notification`

### Logging

- `AuditLog`
- `SystemLog`

## Technical Design Highlights

### Prisma 7

- Prisma 7 connection URLs are configured through `prisma.config.ts`, not the schema file.
- Runtime Prisma access uses `@prisma/adapter-pg` with `pg`.
- Initial migration SQL is being tracked locally before any remote database apply step.

### Google Drive

- Folder mapping must use `folderId` and `folderType`.
- Required folder types:
  - `ROOT`
  - `DOCUMENT_CONTROL`
  - `PDI`
  - `MDR`
  - `SUBMITTED`
  - `RECEIVED`
  - `REJECTED`
  - `TRANSMITTALS`
  - `REVISIONS`

### Document Files

- `DocumentFileType` must support:
  - `SOURCE`
  - `DTG_COVER`
  - `CLIENT_COVER`
  - `MERGED`
  - `TRANSMITTAL`
  - `CLIENT_REPLY`
  - `REJECTED`
  - `REVISION_SOURCE`
  - `PREVIEW`

### Signatures

- Signature events must store date, time, role snapshot, signature image snapshot, target entity, workflow step, and `signatureHash`.

### Logs

- Business audit logs and technical system logs must be separate.
- Important logs are immutable and must not be hard-deleted.

## Open Inputs Needed From User

- Supabase service role key
- Google Drive service account credentials
- Google Drive root/shared drive details if used
- Preferred email provider credentials
- Example cover sheet templates
- Example transmittal design/template
- Final numbering formats per client/project or at least the first client default
- Preferred timezone defaults if different from `Asia/Riyadh`

## Current Verification Snapshot

- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm build` passes
- Route smoke checks return HTTP 200 for:
  - `/dashboard`
  - `/clients`
  - `/masters`
  - `/settings`
  - `/projects`
  - `/projects/new`
  - `/admin/users`

## Update Rule

This file must be updated whenever:

- a major architecture decision changes
- a phase starts or completes
- a domain rule is clarified
- a blocker is discovered
- an external integration decision changes
