# Compatibility Layer

Date: 2026-07-29

Phase 2 retains old MDR imports while assigning one canonical implementation.

| Old application path | Canonical package | Symbols | Removal target |
| --- | --- | --- | --- |
| `src/lib/permissions/rbac.ts` | `@dtg/authorization` | Roles, permissions, evaluation | Phase 4 or later |
| `src/lib/numbering/engine.ts` | `@dtg/document-control-domain` | Number rendering and sequence scope | Phase 3 or later |
| `src/lib/pdi/policy.ts` | `@dtg/document-control-domain` | PDI status and promotion guard | Phase 3 or later |
| `src/server/services/replies/client-reply-policy.ts` | `@dtg/document-control-domain` | Reply state, revisions, file names, review-code precedence | Phase 11 or later |
| `src/lib/pdf/toolkit.ts` | `@dtg/pdf-engine` | Merge, split, page operations, stamp, cover, transmittal | Phase 10 or later |
| `src/lib/prisma/client.ts` | `@dtg/database` | Prisma client creation boundary | Phase 3 or later |

The listed old paths now live under `apps/mdr-web` after the application move.
They are re-export files only; implementations are not duplicated.
Architecture tests assert that representative old and new exports are the
same function and object references.
