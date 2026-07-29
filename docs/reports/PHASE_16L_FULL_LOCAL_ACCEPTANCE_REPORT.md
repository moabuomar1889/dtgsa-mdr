# Phase 16L Full Local Acceptance Report

## 1. Executive Summary

Phase 16L created and executed a Docker-free, loopback-only acceptance runtime.
Automated local gates passed. Owner manual UAT remains the required next action.

## 2. Owner Local-Only Instruction

The owner prohibited all server, staging, VPS, Coolify, Cloudflare, DNS,
production database, real Google, real Drive, real email, and external webhook
activity. The implementation followed that boundary.

## 3. Confirmation That No Server Was Accessed

Confirmed. No SSH or server endpoint was used.

## 4. Confirmation That No External Deployment Occurred

Confirmed. No image, application, database, DNS record, or provider
configuration was deployed.

## 5. Starting Branch and Commit

Branch: `codex/dtg-signature-platform-merge`.

Starting commit: `8e351c627d0328c368a8f1073aacf53f45a57f8a`.

## 6. Final Commit

Recorded after the final Phase 16L commit. See section 52.

## 7. Local Architecture

The runtime launches MDR, Approve, Verify, Platform API, worker, PostgreSQL,
email/webhook support, filesystem source Drive, filesystem controlled Drive,
Ed25519 signing, deterministic malware outcomes, and synthetic directory users.
All generated state is under Git-ignored `.local-runtime`.

## 8. Local Ports

MDR 3100, Approve 3101, Verify 3102, API 4100, email/webhook 4101, control 4199,
and PostgreSQL 55432. Every listener binds to `127.0.0.1`.

## 9. Local Runtime Commands

`local:setup`, `local:seed`, `local:up`, `local:demo`, `local:status`,
`local:acceptance`, `local:qpdf`, `local:backup-restore`, `local:down`,
`local:reset`, and `local:clean` are root commands.

## 10. Local Safety Guard

`@dtg/local-acceptance` rejects disabled/production mode, non-loopback URLs,
non-local or production-like database names, external providers, and paths
outside the runtime root. Four provider tests passed.

## 11. Local Database

Embedded PostgreSQL 17.10 uses database `dtgsa_local_demo` on loopback. All
twelve additive migrations applied. Setup never reuses an external URL.

## 12. Local Identity Provider

The local directory implements `WorkspaceDirectoryAdapter`, supports paged
users/groups and suspension state, and feeds the normal authorization model.
The selector issues the normal internal session and recent-auth evidence.

## 13. Synthetic Users

Ten `@local.test` identities cover DC admin/operator, preparer manager,
reviewer, approvers, validator, auditor, viewer, and external client.

## 14. Local Magic Links

Real token hashing, expiry, revocation, use policy, scope, and session domain
logic remain covered by the Phase 4 suite. Delivery is local-only. Owner portal
walkthrough remains in the manual UAT checklist.

## 15. Local Source Drive

The persistent source adapter exposes opaque IDs, authoritative metadata,
streams/ranges, rename, move, and independent copy semantics.

## 16. Local Controlled Documents

The persistent controlled adapter supports opaque IDs, folders, copy,
resumable upload, ranges, move, rename, trash/missing states, and direct tamper
injection for reconciliation tests.

## 17. Local Permission Simulation

Permission records, restricted principals, unauthorized grants, removal, and
fingerprints use the same controlled-storage contract.

## 18. File Fixtures

Generated fixtures include small/multipage PDFs, exact 10/100/500 MiB valid
PDFs, corrupt PDF, response/approval/transmittal PDFs, metadata, text, SVG,
PDI CSV, and an invalid workbook. Large files remain Git-ignored.

## 19. qpdf Installation and Version

Portable qpdf 12.3.2 was downloaded from the official GitHub release into
`.local-runtime/tools`. Archive SHA-256:
`8941870a604e7c87ed24566b038d46c24ce76616254d2383c578f60c0677f202`.
Executable SHA-256:
`43f79db620ce09529a67572a5de87aec4065b95f11ba6e5918db557f943a7eac`.

## 20. qpdf Results

`VERIFIED_LOCAL`: version, 100/500 MiB structure checks, 100 MiB linearization,
500 MiB merge, corrupt-input rejection, forced timeout/cancellation, and
partial-output cleanup passed in the final aggregate run. Peak process memory
was not observed.

## 21. PDF Viewer Results

Viewer policy/domain tests remain passed from the consolidated suite. Browser
automation covered the local control surface and service health, not a complete
interactive 500 MiB viewer walkthrough. That walkthrough is owner manual UAT.

## 22. 10 MiB Results

Fixture generation and structural availability: `VERIFIED_LOCAL`. Manual
first-page/viewer timing: pending owner UAT.

## 23. 100 MiB Results

qpdf check 346 ms and linearization 920 ms in the final aggregate run.
Viewer interaction remains manual UAT.

## 24. 500 MiB Results

qpdf check 1,620 ms and merge 1,522 ms. Viewer interaction and peak-memory
measurement remain manual/local-machine observations.

## 25. Local Signing Provider

Local Ed25519 generation, key ID, public registry, rotation/retirement,
revocation, signing, unknown/modified failure, and verification passed. Label:
`LOCAL DEVELOPMENT APPLICATION SEAL`.

## 26. Local Malware Scanner Classification

`SIMULATED_PROVIDER`. CLEAN is the only safe result. INFECTED, ERROR, TIMEOUT,
UNAVAILABLE, and UNKNOWN fail closed.

## 27. Local Email Sink

The filesystem sink accepts only `@local.test` and exposes a loopback viewer.
No SMTP or Resend call is possible in local mode.

## 28. Local Webhook Receiver

The loopback receiver validates HMAC, timestamp, event ID, replay, correlation,
and persistence. External destinations are rejected by the guard.

## 29. Worker Results

The durable worker started with all 15 job types and local filesystem storage.
It verifies SHA-256 before reads and uses local temporary artifact lifecycle.

## 30. End-to-End Scenarios

Scenarios A-M are represented by the consolidated domain/integration suites,
synthetic seed, and manual guide. Runtime/service/login paths are
`VERIFIED_LOCAL_E2E`; provider behavior is `SIMULATED_PROVIDER`; the owner's
full role-by-role UI walkthrough is pending and must not be called completed.

## 31. Browser Automation

Playwright 1.62.0 ran two tests: dashboard/service/CSP/network/session switching
and non-synthetic account denial. Result: 2 passed, 0 failed.

## 32. Manual Acceptance Guide

`docs/LOCAL_MANUAL_ACCEPTANCE_GUIDE.md` provides startup, URLs, users, A-M
workflow steps, expected outcomes, issue reporting, reset, stop, and cleanup.

## 33. Security Results

Local guards, CSP, loopback-only network observation, session isolation,
non-synthetic denial, provider rejection, webhook replay, malware fail-closed,
signature tamper, path containment, dependency audit, and existing Phase 15
security tests form the evidence. The production dependency audit reports zero
high or critical findings; ten low/moderate findings remain. The tracked-file
credential-pattern scan passed. The full development audit retains one high
`brace-expansion@1` advisory through ESLint's `minimatch@3` toolchain; it is not
in the production dependency graph, and an incompatible forced major override
was not applied. No destructive network scan ran.

## 34. Performance Results

Recorded final health latency: MDR 569 ms, Approve 112 ms, Verify 145 ms, API
3 ms, and support 7 ms. Twenty concurrent dashboard requests returned 20 HTTP
200 responses in 639 ms. These results do not predict production capacity.

## 35. Backup Results

`VERIFIED_LOCAL`: AES-256-GCM encrypted logical PostgreSQL snapshot, SHA-256
sidecar, repeatable-read isolation, 147 tables, and 197 rows.

## 36. Restore Results

All twelve migrations were applied to `dtgsa_local_restore`; data was restored
with constraints isolated, verified, and the database removed. Measured RTO:
2,240 ms; snapshot RPO: 0 seconds.

## 37. Post-Restore Verification

Users, roles, clients, projects, PDI, MDR, revisions, audit logs, jobs,
response codes, and General Request types matched source counts exactly.

## 38. Legacy Simulation Results

Legacy compatibility behavior remains characterized by the Phase 15 suite.
No real Supabase data or legacy storage was accessed. Full UI reconciliation
walkthrough is owner manual UAT.

## 39. Exact Test Inventory

The repository suite includes characterization, architecture, database
integration, and Phase 3-16 unit files. Phase 16 adds four provider tests and
two separately executed Playwright tests.

## 40. Exact Test Counts

`pnpm test` and `pnpm test:ci` each passed 204 of 204 tests with zero failures,
skips, cancellations, or TODOs. Playwright separately passed 2 of 2 browser
tests.

## 41. Build Results

`pnpm build` passed for all shared packages and all five applications: MDR,
Approve, Verify, Platform API, and worker.

## 42. Migration Results

`pnpm test:db:migrate` applied all twelve migrations from empty.
`pnpm test:db:upgrade` applied them sequentially with compatibility seeds.
Restore validation applied all twelve again to the isolated restore database.

## 43. Documentation Validation

Phase 16 documentation is validated for required files, headings, commands,
status vocabulary, and historical-report preservation. Architecture, lint,
Prisma validation, scoped formatting, and type checking also passed. The
repository-wide formatting command remains red on legacy files outside this
phase; all Phase 16L-owned changes pass Prettier.

## 44. Known Limitations

Live external providers are not verified. Owner role-by-role manual UAT,
complete browser automation of every A-M interaction, 500 MiB viewer behavior,
and peak qpdf memory observation remain explicit limitations. PAdES, trusted
timestamp, KMS/HSM, production certificates, and legal signature claims are
not implemented or claimed.

## 45. Live Google Status

`CODE_COMPLETE_UNVERIFIED_EXTERNAL`. No Google credential or endpoint was used.

## 46. Live Drive Status

`CODE_COMPLETE_UNVERIFIED_EXTERNAL`. No company/shared Drive was read or changed.

## 47. Server Deployment Status

`SERVER_DEPLOYMENT_NOT_STARTED`.

## 48. Owner Manual Testing Instructions

Run `pnpm local:demo`, open the acceptance URL, and follow
`docs/LOCAL_MANUAL_ACCEPTANCE_GUIDE.md`. Report defects before authorizing any
separate deployment phase.

## 49. Remaining Local Defects

No defect remains in the automated Phase 16 gates. Manual UAT may discover
additional workflow or usability defects and is intentionally pending.

## 50. Final Local Acceptance Verdict

`FULL_LOCAL_ACCEPTANCE_COMPLETE` for automated local gates and runtime
preparation. Owner manual UAT is pending and separately required.

## 51. External Integration Readiness

`EXTERNAL_INTEGRATIONS_UNVERIFIED`. This report is not staging or production
readiness.

## 52. Commit History

Phase 15 baseline: `8e351c6`. Phase 16 final commit is recorded after commit
creation without rewriting this historical baseline.

## 53. Git Status

The final requirement is a clean working tree after commit and push on
`codex/dtg-signature-platform-merge`. No merge to main and no force push.
