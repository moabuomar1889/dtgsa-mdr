# PostgreSQL and Prisma-Only Architecture

Date: 2026-07-30

Status: `AUTHORITATIVE`

## Persistence Authority

PostgreSQL is the platform's only application database. Prisma is the only ORM,
schema authority, migration runner, and generated database client used by
application code. The authoritative schema and clean migration are:

- `prisma/schema.prisma`
- `prisma/migrations/0001_initial_dtg_signature_platform/migration.sql`

No application runtime may call a database provider REST API, maintain a second
identity database, or bypass Prisma for domain persistence. Operational SQL is
limited to the reviewed migration, least-privilege role templates, backup, and
restore tooling.

## Identity Authority

Internal production users authenticate through Google Workspace OIDC. Local
acceptance uses a synthetic, loopback-only identity selector. External clients
authenticate through PostgreSQL-backed Magic Link invitations and sessions.
All sessions, identity links, authorization, project scope, recent-auth
evidence, and audit records are persisted in PostgreSQL.

## File Authority

Large files are never stored in PostgreSQL. Production file authority is
Google Drive, separated into controlled and source providers. Local acceptance
uses controlled, source, and temporary filesystem providers under the ignored
`.local-runtime` directory. Database rows store provider-neutral provider keys,
hashes, metadata, and immutable Drive identities where applicable.

## Runtime Boundaries

The five buildable applications are `mdr-web`, `approve-web`, `verify-web`,
`platform-api`, and `worker`. Applications share domain code only through
public `@dtg/*` package exports. The worker and web runtime use the same Prisma
schema and provider contracts.

## Security Invariants

- Local database processes bind only to loopback.
- Production port 5432 must not be public.
- Runtime roles cannot create databases, create roles, or change the schema.
- Published workflow, cover, response-code, and request-form versions are
  immutable.
- Audit and evidence records are append-only for normal runtime roles.
- One active controlled Main PDF and one active approval cycle per revision are
  enforced by PostgreSQL.
- Provider keys and Drive IDs are server-only; browsers receive authorized
  application routes.
