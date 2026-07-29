# Handoff

Date: 2026-07-29

## Current Gate

Phase 3 is complete on `codex/dtg-signature-platform-merge`. Review
`docs/reports/PHASE_3_DATABASE_FOUNDATION_REPORT.md` and the Phase 3 commit
before beginning Phase 4.

## Resume Checklist

1. Confirm the branch and clean working tree.
2. Confirm the Phase 3 commit is present remotely.
3. Run `pnpm install --frozen-lockfile` and `pnpm exec prisma generate`.
4. Run `pnpm test:ci`, `pnpm build`, and `pnpm check:architecture`.
5. Confirm both migrations apply to disposable PostgreSQL.
6. Read the Phase 3 database ownership, constraints, roles, and migration docs.

## Boundaries

Do not treat approval, verification, API, or worker foundations as completed
business features. Do not remove compatibility exports until their target
phases provide parity. The Phase 3 models are not activated runtime features.
Do not connect to live services or production data without explicit
authorization.
