# Import Boundary Rules

Date: 2026-07-29

## Allowed Matrix

| Consumer | May import |
| --- | --- |
| Applications | Declared public `@dtg/*` exports and own source |
| Document-control domain | Prisma enum/types needed by characterized policies |
| Database | Prisma client and adapter |
| Configuration | Contracts |
| UI | React |
| Contracts / authorization / observability | Platform libraries only |

## Prohibited

- A package importing any application.
- An application importing another application's source.
- A workspace dependency not declared with `workspace:*`.
- A workspace dependency cycle.
- A deep import below `@dtg/<package>`.
- Contracts importing Prisma, Next.js, or application aliases.
- Database importing React, Next.js, UI, or an application.
- Browser-safe packages importing database code.
- Circular compatibility exports.

## Enforcement

`pnpm check:architecture` parses package manifests and TypeScript import
specifiers, checks the workspace graph, and compares the MDR route inventory
with `tests/fixtures/architecture/mdr-routes.json`. A fixture test proves that
the validator rejects a dependency cycle.
