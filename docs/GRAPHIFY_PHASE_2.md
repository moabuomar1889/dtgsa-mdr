# Graphify Phase 2

Date: 2026-07-29

## Baseline

The code-only baseline before movement contained 1,374 nodes, 3,193 edges,
116 communities, and no detected import cycles. The focused query covered
authentication, Prisma, RBAC, PDI, MDR, workflow, client replies,
transmittals, PDF, storage, and Google Drive.

## Structural Result

The MDR source moved under `apps/mdr-web`. Characterized pure policies moved
to public `@dtg/*` packages with compatibility re-exports. Prisma transactions,
Supabase, storage, workflow, and Google Drive remain application-owned.

The architecture validator confirms:

- five application boundaries;
- eight shared package boundaries;
- no workspace dependency cycle;
- no package-to-application import;
- no application-to-application import;
- preserved MDR route inventory.

## Post-Move Update

The final code-only update produced 2,001 nodes, 3,876 edges, and 168
communities. The Graphify report states that no import cycles were detected.
One JSON route fixture correctly produced no code nodes. Generated
`graphify-out` artifacts remain ignored by repository policy.

## Interpretation

File movement changes graph node paths and adds operational foundation nodes,
so raw node and edge totals are not expected to remain identical. The relevant
acceptance result is that no prohibited dependency direction or new import
cycle is introduced.
