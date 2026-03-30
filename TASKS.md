# DTGSA MDR Tasks

Last updated: 2026-03-30

Legend:
- `[ ]` Not started
- `[-]` In progress
- `[x]` Done
- `[!]` Blocked

## Project Control Tasks

- [x] Create `prompts/` folder
- [x] Create `skills/` folder
- [x] Create living implementation plan
- [x] Create living task tracker
- [x] Create initial workspace prompt file
- [x] Create initial workspace skill file
- [x] Create initial `.env.example`

## Phase 0 - Workspace and Foundation

- [x] Upgrade local Node.js to 22.x
- [x] Scaffold Next.js latest app with App Router using `pnpm`
- [x] Enable TypeScript strict mode
- [x] Configure Prisma and initial datasource
- [x] Configure Supabase SSR auth
- [x] Configure Tailwind CSS
- [x] Run `npx shadcn@latest init`
- [x] Run `npx shadcn@latest add dashboard-01 https://ui.shadcn.com/blocks`
- [x] Add required shadcn components
- [x] Create shared application shell
- [x] Add `.env.example` validation strategy
- [x] Add linting and formatting baseline
- [x] Add LibreOffice health-check and integration utilities

## Phase 1 - Core Platform

- [x] Design Prisma schema baseline
- [x] Generate initial Prisma migration
- [x] Implement RBAC models and permission helpers
- [ ] Implement user and signature profile flows
- [-] Implement client management
- [-] Implement project management
- [-] Implement settings hierarchy and inheritance services
- [-] Implement discipline management
- [-] Implement review code management
- [-] Implement numbering rule management
- [-] Implement audit log foundation
- [x] Apply initial database schema to Supabase
- [x] Seed foundation roles, permissions, masters, and numbering defaults
- [-] Implement Shared Drive project-folder discovery

## Phase 2 - PDI

- [ ] Implement PDI register model and services
- [ ] Implement PDI CRUD screens
- [ ] Implement DTGSA auto-number generation for PDI items
- [ ] Implement Excel export
- [ ] Implement import flow
- [ ] Implement client numbering portal
- [ ] Implement client notification flow
- [ ] Implement PDI to MDR promotion flow

## Phase 3 - MDR and Workflow

- [ ] Implement MDR document root and revision model
- [ ] Implement document upload flow
- [ ] Implement workflow engine
- [ ] Implement preparer signing
- [ ] Implement reviewer actions
- [ ] Implement approver actions
- [ ] Implement DC check queue
- [ ] Enforce locking and submission rules in backend logic

## Phase 4 - Covers and PDF

- [ ] Implement DOCX template storage and management
- [ ] Implement DTGSA cover generation
- [ ] Implement client cover generation
- [ ] Implement LibreOffice DOCX -> PDF conversion
- [ ] Implement PDF preview
- [ ] Implement PDF merge
- [ ] Implement PDF split
- [ ] Implement PDF reorder
- [ ] Implement PDF rotate
- [ ] Implement PDF delete pages
- [ ] Implement stamping and signature overlays
- [ ] Implement final merged package generation

## Phase 5 - Transmittals

- [ ] Implement transmittal numbering and model
- [ ] Implement transmittal builder UI
- [ ] Implement total attachment size validation
- [ ] Implement transmittal PDF generation
- [ ] Implement email send flow
- [ ] Link submitted documents to transmittals

## Phase 6 - Client Replies and Revision Paths

- [ ] Implement client reply capture
- [ ] Implement review code application
- [ ] Implement rejected file naming automation
- [ ] Implement revision-required branch
- [ ] Implement new-document-number branch
- [ ] Implement response-driven notifications

## Phase 7 - Drive, Dashboards, Hardening

- [ ] Implement full Google Drive folder mapping services
- [ ] Implement project dashboards
- [ ] Implement discipline dashboards
- [ ] Implement task dashboard
- [ ] Implement reporting views
- [ ] Implement mobile polish
- [ ] Implement resilience and hardening pass

## User Inputs Needed

- [-] Supabase credentials
- [-] Google Drive credentials
- [ ] Email provider credentials
- [ ] Cover sheet template samples
- [ ] Transmittal template sample
- [ ] Numbering format examples

## Notes

- This file must be updated continuously through the project.
- Blockers should be marked immediately when discovered.
- Completed work should be checked off in the same turn it is finished.
- Current blocker: LibreOffice is intentionally deferred until DOCX -> PDF work begins.
- Current blocker: Shared Drive access is not yet available to the provided service account or impersonation flow.
- Current note: initial migration SQL was generated locally because `prisma migrate dev --create-only` failed through the Supabase schema engine.
- Current note: workflow, numbering, and RBAC helper modules are now in place as Phase 1 foundations.
- Current note: production build and runtime smoke tests passed for `/dashboard`, `/clients`, `/masters`, `/settings`, `/projects`, `/projects/new`, and `/admin/users`.
- Current note: Phase 1 now has real admin pages for dashboard, clients, masters, settings, projects, onboarding, and users/roles.
- Current note: project onboarding can continue with manual folder mapping even while automatic Shared Drive discovery is blocked.
- Current note: audit-log writes are now in place for new clients, projects, and global master-data records.
- Current note: users/roles admin now includes a Supabase-auth sync action to pull auth users into the local `User` table.
