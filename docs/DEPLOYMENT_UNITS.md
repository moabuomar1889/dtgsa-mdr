# Deployment Units

Date: 2026-07-29

Phase 2 creates independently buildable units but performs no deployment.

| Unit | Local command | Operational surface | Phase 2 claim |
| --- | --- | --- | --- |
| MDR web | `pnpm dev:mdr` | Existing MDR routes | Existing behavior preserved |
| Approval web | `pnpm dev:approve` | `/`, `/api/health`, `/api/ready`, `/api/version` | Foundation only |
| Verification web | `pnpm dev:verify` | `/`, `/api/health`, `/api/ready`, `/api/version` | Foundation only |
| Platform API | `pnpm dev:api` | `GET /health`, `GET /ready`, `GET /version` | Operations only |
| Worker | `pnpm dev:worker` | Process health state and lifecycle logs | No jobs |

The web foundations are separate Next.js applications. The API uses the Node.js
HTTP module to avoid a premature framework commitment. The worker registers no
jobs and performs no polling or external calls. Container, Coolify, DNS,
production database, and live integration work is deferred.
