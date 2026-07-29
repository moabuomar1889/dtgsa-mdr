# Security Operations

Coolify owns runtime secrets; GitHub owns only CI/deployment tokens that are
strictly needed. Inventory includes Google OIDC/Directory/Drive, database
roles, signing provider, Magic Link, email, webhook encryption, malware
scanner, and optional Cloudflare/Coolify tokens. Owners hold recovery material
outside Git and rotate on schedule or incident.

Environments have separate databases, folders, OAuth clients, signing keys,
domains, recipients, and webhook endpoints. Production database roles are
migration, runtime, read-only operations, and backup. PostgreSQL has no public
port. Admin routes use identity policy and edge restrictions; API origins and
rates are constrained.

Production creation, OAuth consent, Drive grants, signing activation, Coolify
deployment, DNS changes, and backup credentials require explicit owner
authorization.
