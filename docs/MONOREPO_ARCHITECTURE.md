# Modular Monorepo Architecture

Date: 2026-07-29

## Status

Phase 2 establishes a pnpm modular monorepo without changing MDR business
behavior or the Prisma data model.

## Repository Shape

```text
apps/
  mdr-web/       Existing MDR Next.js application
  approve-web/   Truthful approval foundation shell
  verify-web/    Truthful verification foundation shell
  platform-api/  Operational Node.js HTTP service
  worker/        Operational worker process foundation
packages/
  contracts/
  configuration/
  database/
  document-control-domain/
  authorization/
  pdf-engine/
  observability/
  ui/
prisma/          Authoritative schema and migration history
tests/           Shared characterization, integration, and architecture tests
scripts/         Root orchestration and validation
docs/            Architecture, decisions, and phase reports
```

## Dependency Direction

```text
contracts
  -> configuration / observability
  -> database / authorization / pdf-engine / ui
  -> document-control-domain
  -> applications
```

The diagram indicates allowed movement toward applications, not a requirement
for every package to depend on every lower layer. Applications are terminal
composition roots. Shared packages never import application source.

## Incremental Extraction

Only characterized deterministic code moved in Phase 2: authorization
vocabulary and evaluation, numbering composition, PDI policy, client-reply
policy, and PDF utilities. Prisma transactions, Supabase authentication,
storage, workflow orchestration, Google Drive, transmittal delivery, and MDR
screens remain in `apps/mdr-web`.

## Tooling

The root package orchestrates pnpm recursively. No Nx or Turborepo layer was
introduced. Each application and package owns a manifest and TypeScript
configuration. The architecture checker enforces package cycles, public
exports, application isolation, and the MDR route baseline.

## Deferred Boundaries

Identity, workflow engine, signature, cover designer, controlled documents,
Drive adapter, client-response engine, audit verification, integrations, and
notifications remain documented future packages. They are not empty runtime
packages in Phase 2.
