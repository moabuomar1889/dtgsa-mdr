<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Database Test Safety

- Never reuse `DATABASE_URL` implicitly as `TEST_DATABASE_URL`.
- Validate the test database host and name before connecting, migrating, truncating, resetting, or deleting.
- Reject production-like names and remote hosts unless explicitly approved.
- Print only redacted connection summaries and never print database passwords.
- Run database characterization through the repository lifecycle script so PostgreSQL is stopped and deleted in `finally`.

## Phase 2 Workspace Boundaries

- Applications live under `apps/*`; shared packages live under `packages/*`.
- Import shared code only through public `@dtg/*` exports.
- Packages must never import application source.
- Applications must never import another application's source.
- Keep the root Prisma schema and migration history authoritative until a later approved phase.
- Run `pnpm check:architecture` after changing workspace dependencies, imports, or MDR routes.
- Preserve Phase 2 compatibility re-exports until their documented removal phase.

## Phase 3 Database Foundation

- Keep one authoritative Prisma schema and additive migration history at the repository root.
- Never edit an applied migration; create a new additive migration.
- Preserve legacy models and compatibility relations until a later parity-approved phase.
- Keep one active controlled Main PDF and one active approval cycle per revision database-enforced.
- Keep published workflow, cover, and response-code versions immutable.
- Treat `AuditLog` as append-only for normal runtime roles and repository operations.
- Use immutable provider identifiers and hashes as authority; paths and filenames are descriptive only.
- Run Prisma validation, disposable migration validation, and database-backed integration tests after schema changes.
