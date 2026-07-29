# DTG Signature Platform

The repository is a pnpm modular monorepo that preserves the working MDR and
PDI application while introducing independently buildable foundations for
approval, verification, API, worker, and shared platform packages.

## Requirements

- Node.js 24
- pnpm 11
- Local PostgreSQL only for the disposable integration suite

## Install

```powershell
$env:CI='true'
pnpm install --frozen-lockfile
pnpm exec prisma generate
```

## Run

```text
pnpm dev:mdr       Existing MDR application on port 3000
pnpm dev:approve   Approval foundation on port 3001
pnpm dev:verify    Verification foundation on port 3002
pnpm dev:api       Operational API on port 3003
pnpm dev:worker    Worker process foundation
```

The approval and verification applications are truthful Phase 2 shells. They
do not implement approval or verification workflows yet. The API exposes only
health, readiness, and version metadata. The worker registers no jobs.

## Validate

```powershell
pnpm lint
pnpm typecheck
pnpm test:ci
pnpm check:architecture
pnpm docs:validate
pnpm build
pnpm exec prisma validate
pnpm test:db:migrate
```

Database-backed tests launch disposable PostgreSQL 17.10 on loopback, apply the
existing migration, and delete the data directory in `finally`. They never
reuse `DATABASE_URL` implicitly as `TEST_DATABASE_URL`.

## Architecture

See `docs/MONOREPO_ARCHITECTURE.md`, `docs/PACKAGE_OWNERSHIP.md`, and
`docs/reports/PHASE_2_MONOREPO_FOUNDATION_REPORT.md`.
