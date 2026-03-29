# DTGSA MDR Implementation Plan

Last updated: 2026-03-29
Status: Planning baseline created

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

- Workspace is currently in planning/setup state.
- Planning documents and project-control folders have been created.
- The local runtime still needs to match the locked stack requirement of Node.js 22.x before app scaffolding begins.
- Current detected local Node version before this plan was written: `20.19.6`.

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
- Configure Prisma
- Configure Supabase SSR auth
- Configure Tailwind CSS
- Initialize shadcn/ui
- Apply `dashboard-01` base shell
- Create shared layout foundation
- Create `.env.example`
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

- Supabase project credentials
- Google Drive service account credentials
- Google Drive root/shared drive details if used
- Preferred email provider credentials
- Example cover sheet templates
- Example transmittal design/template
- Final numbering formats per client/project or at least the first client default
- Preferred timezone defaults if different from `Asia/Riyadh`

## Update Rule

This file must be updated whenever:

- a major architecture decision changes
- a phase starts or completes
- a domain rule is clarified
- a blocker is discovered
- an external integration decision changes

