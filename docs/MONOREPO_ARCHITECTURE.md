# Modular Monorepo Architecture

Date: 2026-07-29

## Status

The Phase 15 architecture is a pnpm modular monorepo with five deployment
units, one PostgreSQL database, additive migrations, reusable domain packages,
and compatibility boundaries that preserve characterized MDR behavior.

## Repository Shape

```text
apps/
  mdr-web/       MDR, PDI, document control, templates, and administration
  approve-web/   Internal approval, review, comments, and General Requests
  verify-web/    Public and authenticated verification
  platform-api/  Scoped versioned integration API
  worker/        Durable jobs, assembly, delivery, and reconciliation
packages/
  authorization/
  client-response-domain/
  configuration/
  contracts/
  controlled-storage-domain/
  cover-designer/
  database/
  document-control-domain/
  identity-domain/
  integration-domain/
  integration-sdk/
  job-engine/
  observability/
  pdf-engine/
  review-domain/
  trust-domain/
  ui/
  verification-domain/
  workflow-engine-domain/
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

Reusable policy and contracts are package-owned. Prisma transactions and
provider composition remain in applications or worker services. Supabase
authentication/storage and fixed workflow compatibility remain in `mdr-web`
until production parity, migration, reconciliation, rollback closure, and
zero-consumer evidence allow retirement.

## Tooling

The root package orchestrates pnpm recursively. No Nx or Turborepo layer was
introduced. Each application and package owns a manifest and TypeScript
configuration. The architecture checker enforces package cycles, public
exports, application isolation, and the MDR route baseline.

## Deployment Boundary

The three web applications use standalone Next.js output. API and worker are
private services. All five use one private project database and deployment
secrets supplied by the environment. No application imports source from
another application.
