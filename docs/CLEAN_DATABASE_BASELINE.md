# Clean Database Baseline

Date: 2026-07-30

Status: `AUTHORITATIVE`

## Baseline

The active migration history contains one initial migration:

```text
prisma/migrations/0001_initial_dtg_signature_platform/migration.sql
```

It is generated from the final Prisma schema and augmented only with reviewed
PostgreSQL constraints, partial indexes, functions, and triggers that Prisma
cannot express. The previous additive migration chain remains available in Git
history and in the local pre-removal tag
`phase-16.1-pre-supabase-removal`.

## Why Consolidation Was Safe

The owner confirmed that the platform had not entered operational use and that
no production data required migration. Phase 16.1 nevertheless used only new
disposable PostgreSQL databases on loopback. No staging, production, hosted
database, or external provider was discovered or contacted.

## Required Validation

Use repository lifecycle commands rather than connecting manually:

```powershell
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma generate
pnpm test:db:migrate
pnpm test:db:upgrade
pnpm local:setup
pnpm local:seed
pnpm local:backup-restore
pnpm local:down
```

The lifecycle scripts reject remote hosts and production-like database names,
redact connection details, and clean disposable data directories in `finally`.

## Change Policy

After this baseline is accepted, never edit the applied migration. Every future
database change must be an additive Prisma migration. Any environment with an
unexpected applied history or operational data is a stop condition requiring
owner review and a separate migration plan.
