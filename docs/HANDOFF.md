# Handoff

Date: 2026-07-29

## Current Gate

Phase 2 is complete on `codex/dtg-signature-platform-merge`. Review
`docs/reports/PHASE_2_MONOREPO_FOUNDATION_REPORT.md` and the Phase 2 commit
before beginning Phase 3.

## Resume Checklist

1. Confirm the branch and clean working tree.
2. Confirm the Phase 2 commit is present remotely.
3. Run `pnpm install --frozen-lockfile` and `pnpm exec prisma generate`.
4. Run `pnpm test:ci`, `pnpm build`, and `pnpm check:architecture`.
5. Confirm the sole migration applies to disposable PostgreSQL.
6. Read all Phase 2 architecture documents and ADRs.

## Boundaries

Do not treat approval, verification, API, or worker foundations as completed
business features. Do not remove compatibility exports until their target
phases provide parity. Do not connect to live services or production data
without explicit authorization.
