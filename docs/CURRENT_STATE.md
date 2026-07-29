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
- Phases 6, 7, and 8: COMPLETE / LOCALLY_VERIFIED.
- Phase 9: COMPLETE / LOCALLY_VERIFIED.
- Phase 10: COMPLETE / LOCALLY_VERIFIED.
- Phase 10 live provider and qpdf verification: `STAGING_REQUIRED`.
- Phase 11: COMPLETE / LOCALLY_VERIFIED.
- Phase 11 live storage and large response-package verification:
  `STAGING_REQUIRED`.
- Phase 12: COMPLETE / LOCALLY_VERIFIED.
- Phase 12 public domain, live key registry, and edge rate-limit verification:
  `STAGING_REQUIRED`.
- Phase 13: COMPLETE / LOCALLY_VERIFIED.
- Phase 13 live webhook destinations, secret manager, and deployment adapters:
  `STAGING_REQUIRED`.
- Phase 14: CODE_CONFIG_COMPLETE / LOCALLY_VERIFIED.
- Phase 14 container execution, staging recovery, domains, and production:
  `BLOCKED_EXTERNAL_ENVIRONMENT_AND_AUTHORIZATION`.

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
20260729153000_phase5_controlled_google_drive
20260729170000_phase6_manifest_and_evidence
20260729190000_phase7_workflow_engine
20260729210000_phase8_cover_designer
20260729230000_phase9_approval_application
20260730010000_phase10_durable_worker
20260730030000_phase11_client_responses
20260730050000_phase12_verification_portal
20260730070000_phase13_integrations_requests
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
compatibility remains intentionally present for rollback. Live Drive,
email/webhook delivery, KMS/HSM signing, qpdf large-file execution, and
production deployment remain staging or later-phase work.

# Phase 6 Trust Foundation

Deterministic package manifests, application seals, approval-evidence
contracts, structured verification, and tamper-evident audit chains are now
implemented. Production KMS/HSM, PAdES, and trusted timestamps remain deferred.

# Phase 7 Workflow Engine

The configurable, versioned workflow engine is locally implemented alongside
the legacy adapter. Package-bound review eligibility, separation of duties,
atomic decisions, reassignment, delegation, overrides, and cycle invalidation
are enforced.

# Phase 8 Cover Designer

Document Control now owns a versioned, inheritance-aware visual cover designer.
Published layouts and generated-cover snapshots are immutable, rendering is
deterministic, Prepared By Manager is formal and visible, and project response
legends are dynamic. Managed DOCX/PDF generation remains a compatibility
fallback.

# Phase 9 Approval Application

The approval app now owns the assignment inbox, exact-package PDF.js review,
truthful review sessions, comments and annotations, atomic decisions, signature
evidence snapshots, returns, and DC outcomes. Controlled file bytes remain
behind authorized range delivery.

# Phase 10 Downloads and Worker

PostgreSQL now owns durable jobs, attempts, leases, heartbeats, retry,
dead-letter, cancellation, progress, correlation, and metrics. MDR queues
Signed Internally and transmittal requests instead of doing heavy work in the
request. Signed Internally creates one private, expiring, hash-verified artifact
without permanent Main PDF duplication. Large-file qpdf and live provider
delivery require staging infrastructure.

# Phase 11 Client Responses and Revisions

Client and project response policies are configurable, versioned, immutable
after publication, and independent from code numbers. Responses preserve exact
policy, effects, files, submissions, and history. Guided revision creation
preserves lineage, creates a new controlled Main hash and Package Hash,
restarts approvals, and never copies signatures. Dynamic response downloads
use the exact submitted Main PDF and the durable worker.

# Phase 12 Verification Portal

The public portal verifies six evidence target types with unpredictable hashed
codes, local browser hashing, structured tamper results, key and seal status,
privacy allowlists, enumeration resistance, rate evidence, and no default file
upload. The authenticated MDR view exposes scoped internal evidence. The
platform verifies application seals and explicitly does not claim PAdES.

# Phase 13 Integrations and General Requests

The platform now exposes a versioned, scoped service API, generated OpenAPI,
typed TypeScript SDK, canonical idempotency, project/client restrictions,
rate/audit evidence, signed durable webhooks, and privacy-safe serialization.
The approval application owns versioned General Request forms, seven initial
templates, attachments, search/history, audit/outbox records, and durable PDF
summary generation. Live external webhook and storage verification remains a
Phase 14 staging gate.

# Phase 14 Operations

Five non-root deployment units, Coolify topology, production migration lock,
CI gates, monitoring alerts, encrypted PostgreSQL backup/restore scripts,
security operations, and disaster-recovery runbooks are prepared. Docker is not
installed in the local verification environment, and no staging/production
credentials or authorization were supplied; images, live restore, DNS, and
deployment remain externally blocked.
