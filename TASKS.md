# DTGSA MDR Tasks

Last updated: 2026-03-29

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

- [!] Upgrade local Node.js to 22.x
- [ ] Scaffold Next.js latest app with App Router using `pnpm`
- [ ] Enable TypeScript strict mode
- [ ] Configure Prisma and initial datasource
- [ ] Configure Supabase SSR auth
- [ ] Configure Tailwind CSS
- [ ] Run `npx shadcn@latest init`
- [ ] Run `npx shadcn@latest add dashboard-01 https://ui.shadcn.com/blocks`
- [ ] Add required shadcn components
- [ ] Create shared application shell
- [ ] Add `.env.example` validation strategy
- [ ] Add linting and formatting baseline
- [ ] Add LibreOffice health-check and integration utilities

## Phase 1 - Core Platform

- [ ] Design Prisma schema baseline
- [ ] Generate initial Prisma migration
- [ ] Implement RBAC models and permission helpers
- [ ] Implement user and signature profile flows
- [ ] Implement client management
- [ ] Implement project management
- [ ] Implement settings hierarchy and inheritance services
- [ ] Implement discipline management
- [ ] Implement review code management
- [ ] Implement numbering rule management
- [ ] Implement audit log foundation

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

- [ ] Supabase credentials
- [ ] Google Drive credentials
- [ ] Email provider credentials
- [ ] Cover sheet template samples
- [ ] Transmittal template sample
- [ ] Numbering format examples

## Notes

- This file must be updated continuously through the project.
- Blockers should be marked immediately when discovered.
- Completed work should be checked off in the same turn it is finished.

