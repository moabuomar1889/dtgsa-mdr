# Deployment

Five immutable units are built from one commit: `mdr-web`, `approve-web`,
`verify-web`, `platform-api`, and `worker`. Web units use standalone Next.js
output; services use the workspace runtime. Images run as UID/GID 1001, expose
only application ports, contain no environment files, and include health
checks. Production records the resolved digest for the version-pinned Node
base, generates SBOM/provenance, uses a read-only root filesystem, and mounts a
size-limited writable `/tmp`.

Promotion is staging smoke, migration backup, locked `prisma migrate deploy`,
health/readiness, then traffic. A failed migration or smoke test blocks release.
Rollback restores the previous image; schema changes use forward fixes unless a
separately approved restore is required.
