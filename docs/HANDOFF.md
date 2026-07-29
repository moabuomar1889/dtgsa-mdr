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

# Phase 6 Handoff

Use `@dtg/trust-domain` for canonical manifests, evidence, seals, timestamps,
verification, and audit chains. Do not treat signature images or legacy
Signature Events as trusted file-bound evidence.

# Phase 7 Handoff

Use the configurable approval engine for new target cases. Keep the fixed
workflow readable until UI and production-data parity are proven. Never bypass
Package Hash review eligibility or decision idempotency.

# Phase 8 Handoff

Use `@dtg/cover-designer` for schema, inheritance, and validation, and
`@dtg/pdf-engine` for authoritative output. Keep signature bytes server-side.
Do not mutate published layouts or replace deterministic visual rendering with
a browser screenshot.

# Phase 9 Handoff

Keep every approval action bound to assignment, current Package Hash, valid
ReviewSession, recent authentication, declaration, and idempotency. Workers may
assemble and deliver artifacts but must not invent or replay approval
decisions.
