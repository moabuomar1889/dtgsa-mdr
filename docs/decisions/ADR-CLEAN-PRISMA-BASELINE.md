# ADR: Establish a Clean Prisma Baseline

Date: 2026-07-30

Status: `ACCEPTED`

## Context

The additive development migration history included retired-provider fields
that no longer exist in the approved schema. The owner confirmed there was no
operational deployment or required production data. Carrying transitional
history into first production use would preserve obsolete concepts forever.

## Decision

Record the pre-consolidation commit and replace the active chain with
`0001_initial_dtg_signature_platform`. Generate its base SQL from the final
Prisma schema, then retain the reviewed PostgreSQL-only invariants Prisma
cannot model. Prove it against a new disposable loopback database, seed
synthetic data, and complete backup/restore before acceptance.

## Guardrail

If any operational or external database had been discovered, consolidation
would have stopped without changing that database. After acceptance, the new
baseline is immutable and all changes are additive migrations.

## Consequences

New environments start from one coherent schema without transitional columns
or enum values. Git history and the local safety tag retain the former chain
for audit. Existing external databases are outside this phase and receive no
automatic reset or squash.
