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

- Keep one authoritative Prisma schema and migration history at the repository root.
- Phase 16.1 establishes `0001_initial_dtg_signature_platform` before first
  operational use; never edit it after acceptance and use additive migrations.
- Preserve legacy models and compatibility relations until a later parity-approved phase.
- Keep one active controlled Main PDF and one active approval cycle per revision database-enforced.
- Keep published workflow, cover, and response-code versions immutable.
- Treat `AuditLog` as append-only for normal runtime roles and repository operations.
- Use immutable provider identifiers and hashes as authority; paths and filenames are descriptive only.
- Run Prisma validation, disposable migration validation, and database-backed integration tests after schema changes.

## Phase 16.1 Provider Boundary

- PostgreSQL is the only application database and Prisma is the only ORM and
  migration authority.
- Production internal identity is `GOOGLE_WORKSPACE`; local acceptance identity
  is `LOCAL_ACCEPTANCE_IDENTITY`; external identity is `MAGIC_LINK`.
- Production storage is `GOOGLE_DRIVE_CONTROLLED` or `GOOGLE_DRIVE_SOURCE`.
- Local storage is `LOCAL_CONTROLLED_FILESYSTEM`,
  `LOCAL_SOURCE_FILESYSTEM`, or `LOCAL_TEMPORARY_ARTIFACT`.
- Never add password login, compatibility authentication modes, public object
  URLs, provider-specific domain fields, or large file bytes in PostgreSQL.
- Run `pnpm check:no-supabase` after changing source, configuration,
  dependencies, database schema, tests, or CI.
