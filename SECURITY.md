# Security Policy

## Supported Baseline

Security fixes target the current `codex/dtg-signature-platform-merge` platform
baseline until the owner authorizes a release branch. Report vulnerabilities
privately to the repository owner; do not include credentials, personal data,
private documents, or exploit details in public issues.

## Security Architecture

- PostgreSQL is the only application database and Prisma is the only ORM.
- Internal production authentication is Google Workspace OIDC.
- External authentication uses PostgreSQL-backed Magic Links.
- Production files use private Google Drive providers.
- Local acceptance uses synthetic identities and filesystem providers on
  loopback only.
- Application database roles are non-superuser and least privilege.
- Audit/evidence records are append-only for normal runtime operations.

## Operational Rules

Never commit secrets, expose port 5432 publicly, use production credentials in
local tests, or run destructive database commands outside repository lifecycle
scripts. Production migration and restore require a backup, migration lock,
owner authorization, and a reviewed runbook. See `docs/SECURITY_OPERATIONS.md`,
`docs/THREAT_MODEL.md`, and `docs/BACKUP_AND_RECOVERY.md`.
