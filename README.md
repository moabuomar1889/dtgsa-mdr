# DTG Signature Platform

The repository is a pnpm modular monorepo for the DTG document-control,
approval, verification, integration, and General Requests platform. It
preserves characterized MDR/PDI behavior while providing five independently
buildable deployment units and shared domain packages.

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
pnpm dev:mdr       MDR and document-control application on port 3000
pnpm dev:approve   Approval and General Requests application on port 3001
pnpm dev:verify    Public verification application on port 3002
pnpm dev:api       Integration API on port 3003
pnpm dev:worker    Durable background worker
```

For the complete Docker-free local acceptance environment:

```powershell
pnpm local:setup
pnpm local:demo
pnpm local:status
```

Open `http://127.0.0.1:3100/local-acceptance` and select a synthetic user.

Production mode uses Google Workspace identity for internal employees and
isolated Magic Links for external clients. Live Google, Drive, signing,
provider, and deployment credentials are not required for local deterministic
tests and must be activated only in an authorized staging environment.

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
pnpm test:db:upgrade
pnpm audit --audit-level high
```

Database-backed tests launch disposable PostgreSQL 17.10 on loopback, apply the
existing migration, and delete the data directory in `finally`. They never
reuse `DATABASE_URL` implicitly as `TEST_DATABASE_URL`.

## Architecture

See `docs/MONOREPO_ARCHITECTURE.md`, `docs/PACKAGE_OWNERSHIP.md`,
`docs/FINAL_GATE_MATRIX.md`, and
`docs/reports/FINAL_MERGE_IMPLEMENTATION_REPORT.md`.

## Readiness

The current verdict is `FULL_LOCAL_ACCEPTANCE_COMPLETE` with
`EXTERNAL_INTEGRATIONS_UNVERIFIED` and `SERVER_DEPLOYMENT_NOT_STARTED`. This
does not authorize staging or production. The owner must complete
`docs/LOCAL_MANUAL_ACCEPTANCE_GUIDE.md` before considering a separate
deployment phase.
