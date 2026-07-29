# Deployment

Status: `SERVER_DEPLOYMENT_NOT_STARTED`

Phase 16.1 is local-only and does not authorize deployment.

## Target Topology

Five immutable units are built from one commit: `mdr-web`, `approve-web`,
`verify-web`, `platform-api`, and `worker`. Web units use standalone Next.js
output; services use workspace runtimes. Containers run non-root, contain no
environment files, expose only application ports, and use health checks.

PostgreSQL is the sole database. Production uses separate migration, runtime,
read-only, and backup roles. Port 5432 must never be public. Production files
use private Google Drive providers; application containers must not rely on
local persistent file storage.

## Promotion Gate

Required sequence: approved staging credentials, backup, migration lock,
`prisma migrate deploy`, service readiness, workflow smoke, queue health,
Drive permission/hash verification, and recorded owner approval. A failed
migration or smoke test blocks promotion.

Rollback restores the previous image. Database changes use forward fixes unless
a separately authorized restore is required. The clean initial migration must
never be applied by resetting an operational database.
