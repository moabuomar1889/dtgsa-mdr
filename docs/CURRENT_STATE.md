# Current State

Date: 2026-07-29

Repository: `moabuomar1889/dtgsa-mdr`

Branch: `codex/dtg-signature-platform-merge`

## Phase Status

- Phases 0, 1, 1.5, 2, and 3: COMPLETE.
- Phase 4: CODE_COMPLETE / STAGING_READY.
- Phase 4 live Google verification: `BLOCKED_EXTERNAL_CREDENTIALS`.
- Phase 5: CODE_COMPLETE / STAGING_READY.
- Phase 5 live Google verification: `BLOCKED_EXTERNAL_CREDENTIALS`.

## Authoritative Workspace

The only authoritative workspace is:

```text
C:\Users\moabu\Documents\Codex\Projects\dtgsa-mdr
```

The obsolete Google Drive clone must not be used.

## Identity State

`mdr-web` now supports Google Workspace OIDC with state, nonce, PKCE, strict
claims and domain validation, immutable Google subject linking, internal
session rotation, CSRF, revocation, and recent-auth evidence. Explicit legacy
and dual modes exist only for development/staging migration. Production
accepts only `GOOGLE_WORKSPACE` and rejects password login and bootstrap.

Directory synchronization supports profiles, departments, groups, scoped role
mapping, dry-run, incremental cursors, suspension, session revocation, and
workflow reassignment flags. Live delegated synchronization remains disabled
without owner-authorized credentials.

The external PDI portal uses isolated Magic Link invitations and sessions
scoped to client, project, and optional PDI items. External identities do not
inherit internal roles.

## Database State

The additive migration inventory is:

```text
20260329143000_init_foundation
20260729111500_phase3_database_foundation
20260729133000_phase4_identity_and_access
```

Phase 4 adds internal and external sessions, OIDC transactions, invitation
scope, Directory runs, mapping versions, role assignments/overrides, link
reviews, and rate-limit state. PostgreSQL enforces valid expiry, immutable
Google subjects, and append-only mapping versions.

## Validation State

Unit/security tests, disposable PostgreSQL integration, empty and upgrade
migrations, lint, typecheck, builds, architecture validation, documentation,
and Graphify are required in the Phase 4 report. No live Google endpoint was
called during ordinary tests.

## Known Limits

Phase 4 is not production-verified until approved OAuth, redirect, Workspace,
and delegated Directory credentials are tested in staging. Supabase
compatibility remains intentionally present for rollback. Controlled Drive,
the replacement workflow engine, final signing, sealing, and production
deployment remain later-phase work.
