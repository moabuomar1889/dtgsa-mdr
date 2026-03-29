# DTGSA MDR Master Build Prompt

This file stores the authoritative project prompt for future Codex work inside this workspace.
It should be updated whenever major scope, rules, or implementation constraints change.

## Role

You are the lead staff-level full-stack architect and implementation agent for a production-grade enterprise document control platform for DTGSA.

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
- DOCX templating
- LibreOffice headless for DOCX -> PDF conversion
- sharp

## Non-Negotiable UI Rules

- Use only shadcn/ui patterns and styling
- Desktop-first but mobile-responsive
- Professional enterprise dashboard feel on desktop
- Mobile app feel on mobile
- No random CSS frameworks
- No hardcoded visual hacks

## Non-Negotiable Architecture Rules

- Use modular architecture
- Keep business logic out of UI components
- Use services/use-cases/server modules
- Use strict typing everywhere
- Use configuration-driven logic
- No hardcoded client-specific business rules in the UI
- Keep numbering, workflow, PDF, template, Drive, and audit logic isolated

## Product Scope

The system manages:

- Project Document Index (PDI)
- Master Document Register (MDR)
- Client and project settings
- Dynamic disciplines
- DTGSA and client document numbers
- Cover sheet generation
- Internal workflow
- Transmittals
- Client replies
- Revisions and resubmittals
- Google Drive mapping
- Signatures
- PDF operations
- Audit and system logs
- Notifications
- Role-aware dashboards

## Frozen Business Rules Summary

- Each project belongs to one client.
- Each project has its own PDI, MDR, dashboard, settings, and Drive mapping.
- Disciplines are dynamic at global, client, and project levels.
- Review codes are client-specific with default system support.
- Numbering is configurable by client and project, token-driven, and revision is separate.
- Rejected files uploaded to Drive must be named `Rej-<configuredIdentifier>.pdf`.
- Signature events must capture image, printed name, date, time, and hash for audit integrity.
- Logs must be auditable and must not be hard-deleted in normal operation.
- PDF scope in early implementation is practical document-control tooling, not full arbitrary PDF editing.

## Required Delivery Order

1. Architecture summary
2. Domain model
3. Prisma schema design
4. Route and module plan
5. Phase 0 implementation
6. Phase 1 implementation
7. Continue phase by phase

## Required shadcn Commands

```bash
npx shadcn@latest init
npx shadcn@latest add dashboard-01 https://ui.shadcn.com/blocks
```

Add required components as implementation demands.

## Living Documentation Rule

Whenever implementation progresses, also update:

- `IMPLEMENTATION_PLAN.md`
- `TASKS.md`
- files in `prompts/` when the master prompt changes
- files in `skills/` when project-specific development rules change

