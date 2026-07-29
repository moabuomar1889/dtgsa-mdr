# Handoff

Date: 2026-07-29

## Current Gate

Phase 5 controlled Drive is code-complete and staging-ready on
`codex/dtg-signature-platform-merge`. Review
`docs/reports/PHASE_5_CONTROLLED_GOOGLE_DRIVE_REPORT.md` before Phase 6.

Live Google identity and Drive verification remain
`BLOCKED_EXTERNAL_CREDENTIALS`; do not report either phase as
production-verified.

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

## Phase 6 Boundary

Document generation may read only verified controlled files through the
platform delivery/storage contract. It must not expose Drive IDs, bypass
integrity status, replace the workflow engine, implement final signing, deploy
to production, or weaken Phase 4/5 controls.
