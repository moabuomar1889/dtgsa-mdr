# Package Ownership

Date: 2026-07-29

| Package | Phase 2 ownership | Allowed dependencies |
| --- | --- | --- |
| `@dtg/contracts` | Operational response and build metadata contracts | None |
| `@dtg/configuration` | Foundation environment parsing and redacted diagnostics | `@dtg/contracts` |
| `@dtg/observability` | Structured lifecycle and request log envelopes | None |
| `@dtg/database` | Prisma client factory, health probe, redacted connection metadata | Prisma client and adapter |
| `@dtg/authorization` | Role, permission, and deterministic permission evaluation | None |
| `@dtg/document-control-domain` | Characterized numbering, PDI, revision, review-code, and reply policies | Prisma enum/types only |
| `@dtg/pdf-engine` | Existing moderate-file PDF operations | `pdf-lib`, `server-only` |
| `@dtg/ui` | Application-neutral foundation status presentation | React peer |

## Application Ownership

| Application | Ownership |
| --- | --- |
| `@dtg/mdr-web` | Existing MDR/PDI product and all current business transactions |
| `@dtg/approve-web` | Approval application operational shell only |
| `@dtg/verify-web` | Privacy-safe verification operational shell only |
| `@dtg/platform-api` | Health, readiness, and build metadata HTTP endpoints |
| `@dtg/worker` | Configuration, health state, lifecycle logs, and shutdown |

## Rules

- An implementation has one canonical owner.
- Applications may consume public package exports.
- Packages may not import `apps/*`.
- One application may not import another application.
- Future ownership remains documentation until real source and validation exist.
