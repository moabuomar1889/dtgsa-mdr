# Handoff

Date: 2026-07-29

## Current Gate

Phase 4 identity and access is code-complete and staging-ready on
`codex/dtg-signature-platform-merge`. Review
`docs/reports/PHASE_4_IDENTITY_AND_ACCESS_REPORT.md` before Phase 5.

Live Google verification remains `BLOCKED_EXTERNAL_CREDENTIALS`; do not report
the phase as production-verified.

## Resume Checklist

1. Confirm the Phase 4 commit exists locally and remotely.
2. Confirm the working tree is clean.
3. Run `pnpm install --frozen-lockfile` and `pnpm exec prisma generate`.
4. Run `pnpm test:ci`, `pnpm build`, `pnpm lint`, and
   `pnpm check:architecture`.
5. Read the Google integration, migration, session, role mapping, portal, and
   threat-model documents.
6. Keep `AUTH_MODE=GOOGLE_WORKSPACE` for every production runtime.
7. Do not enable live Directory synchronization without owner-authorized
   delegated credentials.

## Phase 5 Boundary

Controlled Google Drive may use the authenticated internal identity and the
Phase 3 file authority. It must not merge external sessions with employee
access, replace the workflow engine, implement final signing, deploy to
production, or weaken the Phase 4 security controls.
