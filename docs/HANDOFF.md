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

# Phase 10 Handoff

Use `@dtg/job-engine` and PostgreSQL for every heavy or external side effect.
Never mark delivery successful from enqueue state. Client-response work may
reuse temporary artifact assembly, but must preserve revision lineage, exact
package hashes, controlled Main authority, TTL cleanup, and authorization.
Install and benchmark qpdf in staging before accepting inputs above 32 MiB.

# Phase 11 Handoff

Use `@dtg/client-response-domain` for effects, snapshots, file-kind assembly,
and revision labels. Never branch on a numeric response code. Preserve the
exact `ClientSubmission` Main file and Package Hash, all response versions and
files, and published policy snapshots. Phase 12 may read verification evidence
but must not expose response files, reviewer names, internal comments, or
revision workflow internals publicly.

# Phase 12 Handoff

Use `@dtg/verification-domain` for code hashing, target vocabulary, public
field filtering, and structured results. Raw codes and request addresses must
not be persisted. Public APIs must preserve generic lookup failures and policy
allowlists. Internal evidence must remain project-scoped. Do not describe the
application seal as PAdES.

# Phase 13 Handoff

Use `/api/v1` and `@dtg/integration-sdk` for scoped service integration. Keep
credentials server-side, require idempotency on mutations, enforce project and
client restrictions, and deliver signed webhooks only to validated public
HTTPS destinations. General Request approval must remain human and bound to
the deterministic summary hash.

# Phase 14 Handoff

Use the five deployment units and one private PostgreSQL database. Run
production migrations only through `scripts/deploy-migrate.mjs` after a
verified backup. Never expose PostgreSQL, API, or worker publicly. Docker,
Coolify, DNS, backup destination, and live recovery require owner authorization.

# Phase 15 Final Handoff

The branch is `STAGING_READY`. Start with container build/scan and an isolated
staging database. Activate Google, Drive, email/webhooks, signing provider,
malware scanner, qpdf, domains, monitoring, and encrypted backups through
deployment-owned secrets. Run functional, security, performance, smoke, and
recovery gates and attach evidence to the exact commit.

Do not remove Supabase authentication/storage, fixed workflow, historical
`SignatureEvent`, persistent package compatibility, synchronous provider paths,
or compatibility exports until every gate in
`docs/LEGACY_PARITY_AND_RETIREMENT.md` passes. Do not call the application seal
PAdES.
