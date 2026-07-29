# Database Migration Plan

## Inventory

1. `20260329143000_init_foundation`
2. `20260729111500_phase3_database_foundation`

The second migration is additive. It creates new enums, tables, indexes,
foreign keys, partial unique indexes, and immutability triggers. It alters
`AuditLog` only by adding optional evidence fields.

## Validation

- Empty install: `pnpm test:db:migrate` applies both migrations with Prisma
  Migrate Deploy to disposable PostgreSQL.
- Upgrade: `pnpm test:db:upgrade` applies the baseline SQL, runs the legacy
  seed, applies the Phase 3 SQL, then reruns the seed with Phase 3 fixtures.
- Seed: `pnpm test:db:seed` applies both migrations and runs the legacy plus
  Phase 3 development fixtures.
- Production later: use `prisma migrate deploy`; never reset.

## Recovery

No automatic destructive down migration is supplied. Before production,
capture a backup, stop writers, apply the migration, validate, and forward-fix
if needed. The new tables can remain unused while legacy runtime continues.
