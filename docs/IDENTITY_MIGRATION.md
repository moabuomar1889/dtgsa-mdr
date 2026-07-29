# Identity Migration

Date: 2026-07-29

## Modes

Development and staging expose explicit modes:

1. `LEGACY_SUPABASE`: existing Supabase sessions and password login.
2. `DUAL_TRANSITION`: Google sessions are preferred with temporary Supabase
   compatibility.
3. `GOOGLE_WORKSPACE`: Google OIDC only.

Production rejects every mode except `GOOGLE_WORKSPACE`. Password login and
password bootstrap also reject production independently.

## Migration Procedure

1. Configure the staging OAuth client and exact redirect URI.
2. Set the approved Workspace domain allowlist.
3. Run Directory synchronization in dry-run mode.
4. Review email collisions and group mapping differences.
5. Enable `DUAL_TRANSITION` in staging only.
6. Link pilot users and verify that user IDs, roles, audit history, and
   signature appearance remain unchanged.
7. Resolve ambiguous links in the admin interface and require fresh OIDC.
8. Validate suspension, session revocation, and role reconciliation.
9. Switch staging to `GOOGLE_WORKSPACE` and prove password login is disabled.
10. Obtain owner approval before applying the same target mode in production.

## Rollback

Before production cutover, rollback means returning staging to
`DUAL_TRANSITION` or `LEGACY_SUPABASE`; no identity or role rows are deleted.
After production cutover, the application intentionally refuses a password
fallback. Operational rollback requires a reviewed deployment of the previous
release and must not mutate immutable Google subject links.

Supabase compatibility code remains for migration safety and is marked for
later removal only after parity and owner acceptance.
