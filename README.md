# DTG Signature Platform

The DTG Signature Platform is a pnpm modular monorepo for document control,
PDI-to-MDR promotion, internal approvals, controlled signatures, client
responses, verification, integrations, General Requests, and durable jobs.

## Architecture

- PostgreSQL is the only application database.
- Prisma is the only ORM and migration authority.
- Google Workspace OIDC is the production internal identity provider.
- PostgreSQL-backed Magic Links authenticate external clients.
- Google Drive owns production files.
- Local acceptance uses synthetic identity and filesystem providers.

See `docs/POSTGRESQL_PRISMA_ONLY_ARCHITECTURE.md`,
`docs/AUTHENTICATION_PROVIDERS.md`, and `docs/FILE_STORAGE_PROVIDERS.md`.

## Requirements

- Node.js 24
- pnpm 11
- Windows x64 for the bundled local PostgreSQL acceptance runtime

## Install and Run Locally

```powershell
$env:CI='true'
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm local:clean
pnpm local:setup
pnpm local:seed
pnpm local:demo
pnpm local:status
```

Open `http://127.0.0.1:3100/local-acceptance` and select a synthetic user. No
password is used. The environment is loopback-only and writes ignored
artifacts beneath `.local-runtime`.

## Applications

```text
mdr-web       http://127.0.0.1:3100
approve-web   http://127.0.0.1:3101
verify-web    http://127.0.0.1:3102
platform-api  http://127.0.0.1:4100
worker        background process
```

## Validate

```powershell
pnpm check:no-supabase
pnpm lint
pnpm typecheck
pnpm test:ci
pnpm test:e2e:local
pnpm check:architecture
pnpm docs:validate
pnpm build
pnpm exec prisma validate
pnpm test:db:migrate
pnpm test:db:upgrade
pnpm local:backup-restore
pnpm audit --audit-level high
```

Database tests create disposable PostgreSQL on loopback, reject remote or
production-like names, redact URLs, and delete test data in `finally`.

## Readiness

Phase 16.1 is a local-only architecture transition. Live Google Workspace,
Google Drive, email/webhook, malware/signing providers, public domains, and
server deployment remain unverified or not started. This repository change
does not authorize deployment.
