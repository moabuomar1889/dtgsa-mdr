# Coolify Deployment

Create one Coolify project and private network from
`deploy/coolify/services.yaml`. Reuse one project-specific database in the
shared PostgreSQL service. Do not publish port 5432.

`approve-web` uses `approve.dtgapps.cc`; `verify-web` uses
`verify.dtgapps.cc`; MDR uses the owner-configured domain. API is private by
default and worker has no ingress. All public domains require HTTPS and
Cloudflare Full Strict when proxied.

Each service builds its listed Dockerfile with `APP`. Run the migration job once
with the migration-role URL, a verified backup, and
`PRE_MIGRATION_BACKUP_CONFIRMED=true`. Runtime services receive runtime-role
URLs through Coolify secrets. Health paths are `/api/health` for web and
`/health` for API.

Set CPU/memory limits per measured staging load; initial guardrails are 1 CPU
and 1 GiB per web/API unit, 2 CPU and 2 GiB for worker, 512 MiB `/tmp`, and
connection limits of 10 per web/API and 15 for worker.
