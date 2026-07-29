# Changelog

## 2026-07-29 - Phase 5 Controlled Google Drive

- Added Drive File ID authority, secure Picker handoff, server-side controlled
  copy, SHA-256/page verification, restricted permissions, platform delivery,
  reconciliation, resumable uploads, folder routing, and legacy inventory.

## 2026-07-29 - Phase 4 Identity and Access

- Added Google Workspace Authorization Code OIDC with state, nonce, PKCE,
  immutable subject linking, secure session rotation, CSRF, revocation, audit,
  and forced reauthentication.
- Added explicit legacy, dual-transition, and Google-only authentication modes;
  production accepts only Google Workspace and rejects password fallback.
- Added Directory synchronization, group/project role mapping, explicit
  overrides, version history, suspension handling, and reassignment flags.
- Added isolated external Magic Link invitations, sessions, scoped PDI access,
  rate limiting, replay prevention, revocation, replacement, and admin tools.
- Added additive Phase 4 schema migration, deterministic security tests,
  disposable-database integration tests, environment contracts, and runbooks.
# 2026-07-29 - Phase 6

Added deterministic package manifests, approval evidence, Ed25519 application
seals, verification statuses, artifact evidence, and audit hash chains.
# 2026-07-29 - Phase 7

Added the versioned workflow engine, immutable snapshots, package-bound review,
atomic evidence-backed decisions, separation of duties, overrides,
reassignment, delegation, and legacy parity.
