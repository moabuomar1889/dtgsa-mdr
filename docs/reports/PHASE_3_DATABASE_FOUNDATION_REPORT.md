# Phase 3 Database Foundation Report

Date: 2026-07-29

## 1. Executive Summary

Phase 3 is COMPLETE as an additive database foundation. It adds 77 models,
four enums, compatibility relations, PostgreSQL invariants, role templates,
safe migration/seed validation, and approved fixes for MDR defects 001-003.
Legacy MDR runtime behavior remains active except for those approved PDI
corrections. No live identity, Drive, workflow, signing, worker, or deployment
integration was activated.

## 2. Entry-Gate Evidence

- Branch: `codex/dtg-signature-platform-merge`.
- Starting tree: clean.
- Phase 2 report and remote commits: present.
- Phase 2 baseline: 73 passed, 0 failed, 0 skipped.
- Phase 2 applications/packages: built.
- MDR route parity, migration, architecture, and Graphify cycle gates: passed.

## 3. Starting and Final Commits

- Starting commit: `6de2ff6b7597ab58947ca8d70b63ef5627c6dadb`.
- Phase 3 implementation commit: `PENDING_PHASE_3_IMPLEMENTATION_COMMIT`.

## 4. Models Added

The schema adds 77 models across identity (11), controlled files (11),
workflow (14), covers (7), manifests/evidence (10), client responses (8),
comments (5), and operations/integration (11). The schema now contains 119
models and 26 enums.

## 5. Models Changed

- `User`: identity, employee-profile, and signature-appearance relations.
- `DocumentRevision`: controlled Main File, approval-cycle, and manifest
  relations.
- `AuditLog`: actor snapshot, correlation ID, relevant hashes, previous hash,
  and unique current hash.

No legacy model or field was removed.

## 6. Compatibility Mapping

- `User` remains the current runtime identity; `UserIdentity` provides future
  immutable provider subjects.
- `ReviewCode` and `ClientReply` remain readable; versioned response-code sets,
  snapshots, responses, attachments, and submissions are additive.
- `GeneratedDocument` remains a legacy/generated artifact and is not treated
  as the authoritative controlled Main File.
- Current fixed workflow tables and services remain active; the new workflow
  schema is not routed into runtime.
- PDI, MDR, revision, numbering, transmittal, reporting, and storage records
  remain compatible.

## 7. Constraints and Indexes

Prisma uniqueness and indexing cover provider identities, file identities,
workflow versions/steps/snapshots, manifests/items/hashes, response codes,
submissions, idempotency, webhooks, jobs, and verification codes. Reviewed SQL
adds partial unique indexes and immutability triggers that Prisma cannot
express.

## 8. One-Main-File Invariant

`ControlledMainFile_one_active_per_revision` is a partial unique PostgreSQL
index on `revisionId` where the record is active and not superseded. The
database-backed test proves a second active authoritative file is rejected.
Attachments, client-returned files, and generated artifacts use separate
models.

## 9. Workflow Foundation Schema

Definitions, immutable versions and content, sequential/parallel steps,
snapshots, cycles, instances, assignments, decisions, sessions,
reassignments, delegation use, and separation-of-duties evaluations are
represented. One active cycle per revision is database-enforced. Runtime
routing is deferred to Phase 7.

## 10. Identity Foundation Schema

The additive identity schema separates immutable provider subjects from email,
supports Workspace and external portal identities, group mappings, employee
profiles, versioned signature appearances, departments, delegations,
emergency approvals, and recent authentication evidence. No password, raw
Magic Link token, or live authentication flow was added.

## 11. Controlled Storage Schema

File objects use provider keys and optional Drive identity rather than paths as
authority. Source references, authoritative files, attachments, client files,
generated artifacts, integrity checks, folder rules, uploads, and
reconciliation are distinct. No live Drive operation was implemented.

## 12. Manifest/Evidence Schema

Versioned canonical manifests contain unique items and algorithm hashes.
Approval evidence, platform seals, timestamps, verification records/codes, and
public policies are additive. Manifest uniqueness and verification-code
uniqueness are database-tested. PAdES fields are metadata only and PAdES
remains inactive.

## 13. Client Response Policy Schema

Versioned code sets preserve external wording and explicit outcome flags.
Project configuration, immutable policy snapshots, multiple responses,
attachments, and submissions are represented. Tests prove snapshot content is
retained and published response-code content cannot be mutated.

## 14. Audit Hardening

`AuditLog` gains correlation and hash-chain metadata. A database trigger blocks
updates and deletes, and runtime role SQL separately revokes those grants.
This is an append-only application/database control, not a claim of legal or
physical immutability.

## 15. Outbox/Job Schema

Outbox events, jobs, attempts, deliveries, lease/lock fields, retry/dead-letter
state, idempotency records, integration scopes, webhook delivery, retention,
configuration versions, and audit checkpoints are present. Worker behavior is
not implemented in this phase.

## 16. Defect Closure

- `MDR-DEFECT-001`: FIXED. Invalid non-workbook content returns an actionable
  import validation error.
- `MDR-DEFECT-002`: FIXED. Promotion requires `ClientNumberReceived`.
- `MDR-DEFECT-003`: FIXED. Explicit forward transitions, expected-state writes,
  idempotent retries, and backward-transition rejection are implemented.
- `MDR-DEFECT-004`: OPEN and unchanged for Phase 7.

## 17. Migration Inventory

1. `20260329143000_init_foundation`
2. `20260729111500_phase3_database_foundation`

The second migration creates only additive enums, tables, indexes, foreign
keys, optional audit columns, and triggers. No destructive reset or down
migration is used.

## 18. Empty Migration Result

PASS. `pnpm test:db:migrate` used Prisma Migrate Deploy against disposable
PostgreSQL 17.10 and applied both migrations from an empty database. The
database was stopped and removed in `finally`.

## 19. Upgrade Migration Result

PASS. `pnpm test:db:upgrade` applied the Phase 2 baseline, ran the legacy seed,
applied the Phase 3 SQL, and reran the seed with Phase 3 development fixtures.
`pnpm test:db:seed` separately passed after both migrations. No external
database was contacted.

## 20. Database Role Definitions

`infrastructure/database/roles.sql` provides password-free `NOLOGIN`
migration, runtime, read-only, and backup templates. Roles are
non-superuser/non-role-creating/non-database-creating, use an explicit secure
search path, and separate schema changes from runtime access.

## 21. Test Counts

Final expected full suite:

- Total: 79.
- Passed: 79.
- Failed: 0.
- Skipped: 0.
- Cancelled: 0.
- Todo: 0.

This includes 20 unit/architecture/safety tests, 51 characterization tests,
and 8 disposable-database integration tests.

## 22. Build Results

PASS. Lint, strict typecheck, Prisma validation, Prisma generation,
architecture validation, and production builds completed for five
applications and eight packages.

## 23. Graphify Comparison

Phase 2 recorded 2,001 nodes, 3,876 edges, and 168 communities. Phase 3 records
2,154 nodes, 4,047 edges, and 197 communities. Graphify and the architecture
validator report no import/workspace cycles or prohibited dependency
direction.

## 24. Known Limitations

- Foundation tables are not active runtime engines.
- Future-domain references without Phase 3 enforcement needs remain immutable
  scalar identifiers until their owner package is implemented.
- Live Google identity, Drive, production seals, PAdES, webhooks, workers, and
  deployment are not tested or claimed.
- `MDR-DEFECT-004` remains open.
- No operational production data was inspected; only disposable local data was
  used.

## 25. Phase 4 Readiness

READY_FOR_OWNER_REVIEW. Database, tests, migrations, builds, docs, and
architecture gates pass. Phase 4 remains CLOSED until the owner reviews this
report and explicitly authorizes identity implementation.

## 26. Commit SHA

`PENDING_PHASE_3_IMPLEMENTATION_COMMIT`

## 27. Clean Working Tree

Pending final commit verification. This section will be finalized after the
implementation commit and the report-only SHA update. No untracked or modified
files may remain when Phase 3 is handed off.
