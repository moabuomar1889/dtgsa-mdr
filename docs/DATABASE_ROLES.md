# Database Roles

`infrastructure/database/roles.sql` defines password-free templates:

- Migration: schema changes and migration ownership.
- Runtime: data access without database, role, or schema creation.
- Read-only: query access only.
- Backup: query access required for backups.

All roles use an explicit `public, pg_catalog` search path. Runtime update and
delete access to `AuditLog` is revoked. Production login creation and secrets
require separate owner authorization.
