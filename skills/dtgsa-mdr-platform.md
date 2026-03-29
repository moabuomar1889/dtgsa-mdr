# DTGSA MDR Platform Skill Notes

This file stores stable project-specific guidance that should remain true during implementation.
It is a workspace companion to the Codex user-level skills already installed on the machine.

## Use This Guidance When

- planning the platform architecture
- designing Prisma models
- building project settings, numbering, workflow, and audit systems
- implementing PDI, MDR, transmittals, replies, Drive integration, or signatures
- making UI decisions for the enterprise dashboard shell

## Stable Project Rules

- Use the locked stack exactly as defined in `prompts/master-build-prompt.md`.
- Use `pnpm` only.
- Use shadcn/ui only for UI components.
- Base the shell on `dashboard-01`.
- Keep workflow status, revision status, and client reply state separate.
- Keep Google Drive as storage, not business-logic truth.
- Keep numbering engine isolated and configuration-driven.
- Keep templates isolated from workflow logic.
- Keep PDF logic isolated from UI components.
- Keep logs immutable in normal operation.

## Required Domain Features

- Dynamic disciplines
- Client-specific review codes
- Project-specific overrides
- Tokenized numbering engine with sequence scopes
- Project-level roles
- Signature events with hashes
- Transmittal workflow
- PDI to MDR lifecycle
- DOCX -> PDF conversion via LibreOffice headless

## Current Known Blockers

- Local Node.js runtime needs to be aligned to 22.x before Phase 0 scaffold work.
- External credentials are still needed for Supabase, Google Drive, and email integrations.

## Maintenance Rule

Update this file when:

- a stable architecture rule changes
- a domain rule becomes frozen
- a blocker is discovered or removed
- the implementation strategy changes in a lasting way

