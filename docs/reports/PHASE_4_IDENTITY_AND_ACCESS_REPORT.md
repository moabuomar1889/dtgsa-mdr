# Phase 4 Identity and Access Report

Date: 2026-07-29

## Executive Summary

Phase 4 is CODE_COMPLETE and STAGING_READY. Internal target authentication is
Google Workspace OIDC, production rejects local password fallback, and the PDI
client portal uses isolated Magic Link identities and sessions. Live Google
verification is not claimed because approved credentials are unavailable.

## Entry Gate

- Branch: `codex/dtg-signature-platform-merge`.
- Starting commit: `a51a019818203977cbe8d19ff883a6545617436a`.
- Phase 3 report, migrations, tests, build, and remote commit: verified.
- Starting working tree: clean.
- Controlled Google Drive and the replacement workflow engine were not started
  during Phase 4.

## OIDC Implementation

The server-side Authorization Code flow uses official Google authorization,
token, and JWKS endpoints. It implements one-time state, nonce, PKCE S256,
encrypted verifier storage, exact redirect validation, issuer/audience/expiry
checks, verified email, hosted-domain plus email-domain policy, immutable
subject authority, generic callback errors, secure cookies, CSRF, session
rotation, revocation, login/logout audit, and forced reauthentication.

## Account Linking

Google `sub` is authoritative and PostgreSQL-immutable. Exact verified email
linking is accepted only for one active user inside an allowed Workspace
domain. Missing or ambiguous matches create a review. Admin approval records
the selected candidate, but linking occurs only after a fresh OIDC event with
the same subject fingerprint and email. Existing user IDs, roles, history, and
signature appearance remain unchanged.

## Supabase Transition

`LEGACY_SUPABASE`, `DUAL_TRANSITION`, and `GOOGLE_WORKSPACE` are explicit.
Legacy and dual modes are for development/staging migration only. Production
configuration rejects every mode except `GOOGLE_WORKSPACE`; password login and
password bootstrap also independently reject production. Compatibility code
and rollback instructions remain available for later removal.

## Directory Adapter

The live adapter uses read-only user and group scopes and requires explicit
enablement plus delegated credentials. Dry-run, incremental cursors, manual
resync, profile fields, employee ID, department, job title, suspension,
timestamps, errors, user/group counters, and deterministic fake pages are
implemented. Ordinary tests do not call Google.

## Group Mappings

Immutable Google group IDs map to existing system or project roles and optional
departments. Explicit user overrides are supported. Reconciliation tracks
which grants it created and removes only stale owned grants. Every mapping
change creates an audited numbered snapshot; PostgreSQL makes snapshots
append-only. Signing eligibility covers prepared-by manager, reviewer,
approver, DC validator, and auditor roles.

## Suspension Behavior

Directory suspension deactivates the employee, rejects new sessions, revokes
active sessions and recent-auth evidence, blocks future approvals through a
server policy, and flags pending assignments for reassignment. Historical
approvals, signature snapshots, and audit history are not deleted or changed.

## Recent Authentication

Recent-auth evidence is bound to user, internal session, and token hash. It
expires inside a configurable window, is revoked with the session, and can be
single-use. Forced Google reauthentication is exposed for later signing and
workflow phases; final signing is not implemented here.

## Magic Link Security

External invitation scope is client plus optional project and PDI items.
Tokens are high entropy and only hashes are persisted. Expiry, one-time or
controlled reuse, attempts, rate limits, atomic consumption, revocation,
replacement/resend, secure external sessions, CSRF, audit, last use, and
cross-client/project/item denial are implemented. Replacing an invitation
revokes its sessions. External users inherit no internal role or approval
visibility.

## Route Protection

Central route classification separates internal, external, public
verification, and authentication routes. The Next proxy provides an early
cookie gate while every protected server action/service validates the database
session, CSRF where applicable, authorization, and project/client scope. An
external cookie cannot authorize internal operations and an internal session
cannot authorize external portal operations.

## Database Migration

`20260729133000_phase4_identity_and_access` is additive. It adds identity
sessions, OIDC transactions, portal invitations/sessions, Directory runs,
mapping versions and assignments, overrides, link reviews, and rate limits.
Empty deployment and upgrade from the Phase 3 database both pass on disposable
PostgreSQL 17.10.

## Test Inventory

- Identity/security unit tests: production mode, OIDC state/nonce/claims,
  PKCE, encryption, sessions, Magic Link lifecycle, recent authentication,
  route isolation, role scope, eligibility, and fake Directory pages.
- Database integration: immutable Google subject, expiry constraints,
  append-only mapping versions, token hashing, replay denial, client/project
  scope, audit, group reconciliation, suspension, session revocation, and
  reassignment.
- Existing architecture, characterization, migration, and business behavior
  suites remain included with zero skips.

Final full-suite result:

- Total: 102.
- Passed: 102.
- Failed: 0.
- Skipped: 0.
- Cancelled: 0.
- Todo: 0.

This includes 42 unit/architecture/security tests, 51 characterization tests,
and nine disposable-database integration tests.

## Build and Static Checks

- ESLint: PASS with zero warnings.
- TypeScript: PASS for all applications and packages.
- Prisma format, validation, and client generation: PASS.
- Production build: PASS for five applications and nine packages.
- Architecture validation: PASS; no workspace cycles.
- Documentation validation: PASS for all Phase 2, Phase 3, and Phase 4 required
  documents.
- Phase 4 changed-file formatting: PASS. Repository-wide formatting remains
  affected by pre-existing files outside this phase and is not represented as
  a clean global gate.

## Graphify Comparison

Phase 3 recorded 2,154 nodes, 4,047 edges, and 197 communities. Phase 4 records
2,374 nodes, 4,547 edges, and 206 communities. Focused queries resolve the new
OIDC, Directory, role mapping, invitation, session, and PDI scope paths.

## Live Verification Status

`BLOCKED_EXTERNAL_CREDENTIALS`

Approved OAuth client credentials, owner-controlled redirect configuration,
Workspace consent, and delegated Directory credentials are unavailable in the
local workspace. No secret was requested, logged, committed, or included in
this report. Staging and production Google behavior is not claimed verified.

## Remaining Blockers

- Owner-provided staging OAuth client and exact redirect URI.
- Approved Workspace domain and test users.
- Owner-authorized delegated Directory credentials if group sync is enabled.
- Staging validation of cookie domain, consent, email delivery, suspension, and
  least-privilege scopes.

These are external verification blockers, not incomplete local code paths.

## Phase 5 Readiness

READY. The employee identity, server authorization, session, and database
foundations required by controlled Google Drive are available. Phase 5 must
preserve identity isolation and may not weaken route, session, or audit
controls.

## Commit SHA

`8bb829fdb93915ddfc9097e3e14ac39e0fec08e5`

## Working Tree

PASS. The Phase 4 implementation commit produced a clean tree. This report SHA
update is committed separately, after which the branch is pushed and compared
with the remote head.
