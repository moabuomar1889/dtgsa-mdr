# Claude Code Handoff

Date: 2026-07-31

Project: DTG Signature Platform / DTGSA MDR

Repository: `moabuomar1889/dtgsa-mdr`

## 1. Purpose of This Handoff

This document is the entry brief for a new Claude Code session. It describes
the authoritative workspace, exact Git state, product purpose, architecture,
runtime, user workflows, completed work, current verification evidence,
remaining gates, and the rules that must be preserved when changing the code.

Do not infer the current architecture from old phase prompts or historical
reports. Use the precedence order in this document.

## 2. Authoritative Repository State

| Item                        | Authoritative value                                 |
| --------------------------- | --------------------------------------------------- |
| Local workspace             | `C:\Users\moabu\Documents\Codex\Projects\dtgsa-mdr` |
| Git remote                  | `https://github.com/moabuomar1889/dtgsa-mdr.git`    |
| Active branch               | `codex/dtg-signature-platform-merge`                |
| Handoff baseline commit     | `9e95cf764a9f7dd467bf65e4367296b22a6f6231`          |
| Baseline subject            | `perf(ui): smooth authenticated navigation`         |
| Database authority          | PostgreSQL                                          |
| ORM and migration authority | Prisma                                              |
| Package manager             | pnpm 11                                             |
| Node.js baseline            | Node.js 24                                          |
| Primary web framework       | Next.js 16.2.12 / React 19                          |

The working tree was clean before this handoff document was updated. Confirm
the state again at the beginning of every session:

```powershell
git status --short --branch
git log -8 --oneline --decorate
git rev-parse HEAD
```

Never use the obsolete workspace:

```text
G:\My Drive\test\dtgsa-mdr
```

That path is an old clone and is not an authority for source, data, tests, or
documentation.

## 3. Current Verdict

- Phases 0 through 15 are implemented or locally accepted within their stated
  boundaries.
- Phase 16L local runtime and automated local acceptance are complete.
- Phase 16.1 removal of the retired backend provider is complete.
- The active application uses PostgreSQL and Prisma only.
- The MDR web application has completed the DTGSA Nocturne visual migration.
- Protected navigation and permission-aware restricted pages are implemented.
- Sidebar navigation uses Next.js client transitions instead of full reloads.
- Owner role-by-role manual UAT remains pending.
- Live external integrations remain unverified.
- Server deployment has not started.

Use these exact status terms:

```text
FULL_LOCAL_ACCEPTANCE_COMPLETE
EXTERNAL_INTEGRATIONS_UNVERIFIED
SERVER_DEPLOYMENT_NOT_STARTED
```

Do not describe the platform as production-deployed, staging-verified, PAdES
signed, or legally certified.

## 4. Product Mission

The platform manages controlled engineering documents from project setup
through client issue and response. Its main responsibilities are:

- client, project, discipline, numbering, and configuration masters;
- PDI registration, import/export, client numbering, and PDI-to-MDR promotion;
- MDR document and revision lifecycle management;
- controlled source and Main PDF file handling;
- configurable, versioned internal review and approval workflows;
- cover design, immutable cover versions, and deterministic PDF rendering;
- document comments, returns, resolutions, and separation of duties;
- transmittal creation, generated outbound packages, and delivery evidence;
- client replies, response-code policy snapshots, and revision lineage;
- public privacy-safe package and evidence verification;
- durable jobs, retries, dead-letter behavior, assembly, and reconciliation;
- audit, reports, search, notifications, administration, and identity control;
- scoped integration API, webhooks, SDK, and General Requests.

## 5. Non-Negotiable Architecture

### 5.1 Database

PostgreSQL is the only application database. Prisma is the only ORM, schema
authority, migration runner, and generated database client.

Authoritative files:

```text
prisma/schema.prisma
prisma/migrations/0001_initial_dtg_signature_platform/migration.sql
```

The clean initial migration was established before operational use. Never edit
an accepted initial migration. Future database changes must use additive
migrations.

Required database invariants include:

- one active controlled Main PDF per revision;
- one active approval cycle per revision;
- immutable published workflow, cover, response-code, and form versions;
- append-only audit/evidence behavior for normal runtime roles;
- explicit owning relations and restrictive deletion behavior;
- provider-neutral metadata and hashes instead of file bytes;
- private production PostgreSQL with no public port 5432.

Never reuse `DATABASE_URL` implicitly as `TEST_DATABASE_URL`. Database tests
must use the repository lifecycle scripts, validate loopback host and safe
database names, redact passwords, and delete disposable databases in `finally`.

### 5.2 Identity

| Audience                | Environment             | Provider                    |
| ----------------------- | ----------------------- | --------------------------- |
| Internal employee       | Production/staging      | `GOOGLE_WORKSPACE`          |
| Internal synthetic user | Local acceptance only   | `LOCAL_ACCEPTANCE_IDENTITY` |
| External client         | Authorized environments | `MAGIC_LINK`                |

There is no password login, password bootstrap, provider-JWT compatibility
mode, or fallback identity database.

Production Google Workspace authentication uses Authorization Code OIDC with
state, nonce, PKCE, issuer/audience validation, verified email, hosted-domain
validation, and immutable Google subject linking.

Local acceptance creates normal PostgreSQL-backed sessions and applies the
normal permission, project-scope, CSRF, revocation, recent-auth, and audit
rules. It is not an authorization bypass.

### 5.3 Files

| Purpose             | Production provider                  | Local provider                |
| ------------------- | ------------------------------------ | ----------------------------- |
| Controlled files    | `GOOGLE_DRIVE_CONTROLLED`            | `LOCAL_CONTROLLED_FILESYSTEM` |
| Source files        | `GOOGLE_DRIVE_SOURCE`                | `LOCAL_SOURCE_FILESYSTEM`     |
| Temporary artifacts | Environment-specific private storage | `LOCAL_TEMPORARY_ARTIFACT`    |

Large files must not be stored in PostgreSQL. Browsers receive authorized
application routes, not provider IDs, Drive credentials, filesystem paths, or
public object URLs. Immutable provider identity and hash evidence are
authoritative; names and paths are descriptive snapshots only.

### 5.4 Monorepo Boundaries

Applications live under `apps/*`. Shared packages live under `packages/*`.

```text
apps/
  mdr-web/       PDI, MDR, projects, files, transmittals, replies, admin
  approve-web/   Internal review, approval, comments, General Requests
  verify-web/    Public and authenticated evidence verification
  platform-api/  Versioned, scoped integration API
  worker/        Durable jobs, assembly, delivery, and reconciliation

packages/
  authorization/
  client-response-domain/
  configuration/
  contracts/
  controlled-storage-domain/
  cover-designer/
  database/
  document-control-domain/
  identity-domain/
  integration-domain/
  integration-sdk/
  job-engine/
  local-acceptance/
  observability/
  pdf-engine/
  review-domain/
  trust-domain/
  ui/
  verification-domain/
  workflow-engine-domain/
```

Applications may import shared code only through public `@dtg/*` exports.
Packages must never import application source. One application must never
import another application's source. Preserve compatibility exports until a
separately approved removal phase.

## 6. Core User Workflows

### 6.1 Document Control Workflow

1. Document Control creates client and project configuration.
2. Document Control maintains disciplines, numbering, response codes, and
   workflow/cover defaults.
3. A PDI item is created or imported.
4. The item is sent for client numbering when required.
5. The external client accesses only the scoped Magic Link portal and supplies
   the client document number.
6. An eligible PDI item in `ClientNumberReceived` is promoted to the MDR.
7. A revision is created and a source PDF is copied into controlled storage.
8. File integrity, page count, MIME type, provider identity, and SHA-256
   evidence are recorded.
9. A workflow definition and cover version are snapshotted for the revision.
10. The revision moves through preparation, review, approval, additional
    manager steps when configured, and final DC validation.
11. A transmittal packages the exact approved Main PDF and attachments.
12. The worker assembles generated artifacts and records immutable evidence.
13. The package is issued to the client.
14. A client reply is recorded against the configured response-code policy.
15. The policy effects determine correction, rejection, resubmission, approval,
    or final lifecycle closure without copying prior signatures.

### 6.2 Approval Workflow

The default engineering path separates these responsibilities:

```text
Prepared By Manager
Reviewer
Approver
Additional Manager, when configured
DC Validator
```

Formal decisions must be package-bound, user-bound, time-bound, authorized,
recently authenticated where required, and idempotent. The package hash,
workflow snapshot, actor snapshot, comments, decision, and signature evidence
must remain auditable.

Blocking comments must be resolved before approval. A return requires a reason,
owner, due date, and confirmation. Separation-of-duties conflicts fail closed
unless a separately authorized, scoped, expiring emergency override exists.

### 6.3 External Client Workflow

External clients authenticate only through scoped Magic Links. They may access
only the invited client/project/PDI scope. They cannot inherit internal roles,
open internal approvals, or browse unrestricted files.

### 6.4 Verification Workflow

The verification application accepts supported verification targets and
returns only allowlisted, privacy-safe evidence. Unknown and revoked targets
use enumeration-resistant responses. Verification never exposes private file
bytes or internal workflow details.

### 6.5 Durable Worker Workflow

The PostgreSQL-backed worker leases idempotent jobs, uses bounded retry and
dead-letter rules, verifies file hashes before reads, creates encrypted
temporary workspaces, assembles deterministic outputs, persists artifact
evidence, and cleans temporary files after success or failure.

## 7. Local Identities

Local users are synthetic and use the `@local.test` domain.

| Identity                        | Primary purpose                                   |
| ------------------------------- | ------------------------------------------------- |
| `dc.admin@local.test`           | Document Control administration and configuration |
| `dc.operator@local.test`        | PDI, MDR, files, transmittals, replies            |
| `prepared.manager@local.test`   | Prepared By decision                              |
| `reviewer@local.test`           | Independent technical review                      |
| `approver@local.test`           | Formal approval                                   |
| `additional.manager@local.test` | Additional configured approval                    |
| `dc.validator@local.test`       | Final Document Control validation                 |
| `auditor@local.test`            | Read-oriented audit, reports, and verification    |
| `project.viewer@local.test`     | Restricted project visibility                     |
| `client.user@local.test`        | External client Magic Link workflow               |

No local password exists. Select the identity at:

```text
http://127.0.0.1:3100/local-acceptance
```

Do not invent or add password login to make local testing easier.

## 8. Local Runtime

### 8.1 Requirements

- Windows x64;
- Node.js 24;
- pnpm 11;
- Chromium installed through Playwright;
- loopback ports available;
- no production or staging credentials.

PowerShell may block `pnpm.ps1`. If that occurs, use `pnpm.cmd` rather than
changing the machine execution policy.

### 8.2 Safe Start

For an existing workstation, check status before cleaning or resetting:

```powershell
pnpm.cmd local:status
```

If the demo is already configured:

```powershell
pnpm.cmd local:demo
pnpm.cmd local:status
```

For a clean first setup:

```powershell
$env:CI='true'
pnpm.cmd install --frozen-lockfile
pnpm.cmd exec prisma generate
pnpm.cmd local:clean
pnpm.cmd local:setup
pnpm.cmd local:seed
pnpm.cmd local:demo
pnpm.cmd local:status
```

### 8.3 Local URLs

| Service                         | URL                                      |
| ------------------------------- | ---------------------------------------- |
| MDR and local identity selector | `http://127.0.0.1:3100/local-acceptance` |
| MDR dashboard                   | `http://127.0.0.1:3100/dashboard`        |
| Approval                        | `http://127.0.0.1:3101`                  |
| Verification                    | `http://127.0.0.1:3102`                  |
| Platform API health             | `http://127.0.0.1:4100/health`           |
| Local email/webhook support     | `http://127.0.0.1:4101`                  |
| Embedded PostgreSQL             | `127.0.0.1:55432`                        |

At the time this handoff was written, the local runtime reported all services
running. Treat that as a snapshot only and use `local:status` to confirm.

All generated state is Git-ignored beneath `.local-runtime`. Never publish
`.local-runtime/config.json`; it contains local-only secrets.

### 8.4 Stop, Reset, and Clean

```powershell
pnpm.cmd local:down
pnpm.cmd local:reset -- --confirm-local-reset
pnpm.cmd local:clean
```

`local:down` preserves the demonstration database. Reset and clean are
destructive to local synthetic state and must not be the first troubleshooting
step.

## 9. Current UI State

The MDR web application uses the DTGSA Nocturne design system:

- dark and light themes;
- six accent presets plus validated custom accent input;
- compact enterprise shell with desktop and mobile navigation;
- DTG-owned primitives under `apps/mdr-web/src/components/dtg`;
- Lucide icons;
- Radix behavior for accessible menus, dialogs, and focus management;
- Vaul drawers, Sonner notifications, and Recharts where needed.

Do not reintroduce Shadcn-generated `components/ui`, `next-themes`,
`class-variance-authority`, `clsx`, `tailwind-merge`, or old theme aliases.

Recent navigation fixes replaced plain sidebar anchors with `next/link`, added
an inline pending indicator using `useLinkStatus`, and removed a layout script
that caused React warnings on permission-denied navigation. Theme restoration
now occurs in the client theme provider and uses browser `localStorage`.

Development mode compiles dynamic routes on first visit, so the first
navigation can be slower than a warmed route. Do not confuse this expected
development compilation with a production performance result. Server logs
showed warmed report responses as low as 59 ms after the navigation fix.

## 10. Recent Commits

Read these commits before changing the shell, permissions, or navigation:

```text
9e95cf7 perf(ui): smooth authenticated navigation
5d8ae1d fix(auth): align protected navigation and page access
285acdc fix(auth): handle transmittal access safely
8db26ad feat(ui): complete DTGSA Nocturne migration
bbbd7f3 refactor(ui): move primitives into DTG component namespace
11d5e16 feat(ui): rebuild the Nocturne application shell
1e8b1fc feat(ui): add DTGSA Nocturne theme foundation
```

The protected navigation contract is:

- navigation should hide actions the current user cannot use;
- direct access must still enforce server-side authorization;
- denied pages should render the controlled restricted state or approved
  framework denial behavior, not crash with an unhandled permission error;
- authorization must never rely only on hidden links.

## 11. Verification Evidence

The latest focused verification after the navigation and theme changes passed:

| Gate                                | Result        |
| ----------------------------------- | ------------- |
| ESLint                              | Passed        |
| MDR TypeScript                      | Passed        |
| MDR production build                | Passed        |
| Architecture validator              | Passed        |
| Retired-provider gate               | Passed        |
| Unit tests                          | 135 passed    |
| Local Playwright                    | 4 passed      |
| Browser console on fresh navigation | No new errors |
| Graphify update                     | Completed     |

The four Playwright tests cover the local control surface and identity switch,
non-synthetic account rejection, preservation of the application shell during
sidebar navigation, and permission-aware protected modules.

The Phase 16L baseline previously passed the full 204-test suite, five
application builds, disposable migration/upgrade checks, qpdf acceptance, and
encrypted backup/restore. Re-run current gates instead of treating historical
counts as proof after new changes.

Recommended full validation:

```powershell
pnpm.cmd check:no-supabase
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test:ci
pnpm.cmd test:e2e:local
pnpm.cmd check:architecture
pnpm.cmd docs:validate
pnpm.cmd build
pnpm.cmd exec prisma validate
pnpm.cmd test:db:migrate
pnpm.cmd test:db:upgrade
pnpm.cmd local:backup-restore
pnpm.cmd audit --audit-level high
```

The database characterization lifecycle is mandatory for database-backed
tests. Do not run ad hoc truncate, reset, or migration commands against an
unvalidated connection string.

## 12. Required Working Rules

1. Read `AGENTS.md` before work.
2. When `graphify-out/graph.json` exists, query Graphify before broad source
   browsing.
3. Use `graphify query`, `graphify path`, or `graphify explain` to scope work.
4. Run `graphify update .` after modifying code.
5. Read the relevant local Next.js 16 documentation under
   `node_modules/next/dist/docs/` before changing Next.js behavior.
6. Preserve application/package dependency direction.
7. Run `pnpm.cmd check:architecture` after changing workspace dependencies,
   cross-package imports, or MDR routes.
8. Run `pnpm.cmd check:no-supabase` after changing source, configuration,
   dependencies, schema, tests, or CI.
9. Preserve authorization on the server even when navigation is permission
   aware.
10. Never expose credentials, provider IDs, filesystem paths, database
    passwords, or private file URLs to the browser.
11. Never edit accepted migrations; add a new migration.
12. Do not revert unrelated owner changes in a dirty worktree.
13. Do not force-push, amend commits, merge to `main`, deploy, or modify remote
    services without explicit owner authorization.
14. Commit and push completed, verified work to
    `codex/dtg-signature-platform-merge` unless the owner directs otherwise.

## 13. Known Limitations and External Gates

The following items are not proven by local acceptance:

- live Google Workspace OAuth and delegated Directory synchronization;
- real shared-drive permissions, copy, range, hash, and large-file behavior;
- external email delivery and external webhooks;
- production malware scanning;
- KMS/HSM-backed signing;
- trusted RFC 3161 timestamps;
- PAdES signatures;
- public domains, TLS, reverse proxy behavior, and DNS;
- container registry and server deployment;
- production database roles, retention, monitoring, and recovery;
- production capacity and 500 MiB interactive viewer behavior;
- complete owner role-by-role manual UAT.

PAdES is explicitly deferred. The local Ed25519 label is:

```text
LOCAL DEVELOPMENT APPLICATION SEAL
```

It is not a production certificate, trusted timestamp, qualified signature, or
legal-signature claim.

Do not add real Google, Drive, SMTP, production database, company Drive, VPS,
Coolify, Cloudflare, DNS, remote storage, or deployment credentials to the
local acceptance environment.

## 14. Recommended Next Work

Priority 1 is owner manual UAT, not another architecture phase.

1. Start or confirm the local demo.
2. Follow `docs/LOCAL_MANUAL_ACCEPTANCE_GUIDE.md` workflows A through M.
3. Record the selected identity, URL, timestamp, expected result, actual
   result, and screenshot for every failure.
4. Fix reproducible local defects with regression tests.
5. Re-run the focused and full validation gates.
6. Update the relevant report and this handoff when the baseline changes.

Only after separate owner authorization:

1. create a staging plan and credential inventory;
2. build and scan all five deployment units from one commit;
3. provision private PostgreSQL roles and protected secrets;
4. verify Google Workspace, Drive, email, webhooks, malware, signing, domains,
   backup, restore, and observability in staging;
5. obtain recorded owner acceptance before any production deployment.

This handoff does not authorize those staging or deployment actions.

## 15. Authoritative Reading Order

Read current operational documents in this order:

1. `AGENTS.md`
2. `docs/HANDOFF.md`
3. `docs/CURRENT_STATE.md`
4. `docs/POSTGRESQL_PRISMA_ONLY_ARCHITECTURE.md`
5. `docs/AUTHENTICATION_PROVIDERS.md`
6. `docs/FILE_STORAGE_PROVIDERS.md`
7. `docs/LOCAL_DEVELOPMENT.md`
8. `docs/LOCAL_MANUAL_ACCEPTANCE_GUIDE.md`
9. `docs/ROADMAP.md`
10. `docs/reports/PHASE_16_1_SUPABASE_ELIMINATION_REPORT.md`
11. `docs/reports/PHASE_16L_FULL_LOCAL_ACCEPTANCE_REPORT.md`
12. `docs/reports/NOCTURNE_UI_MIGRATION_REPORT.md`

Historical phase reports preserve truthful evidence about earlier states. If a
historical report conflicts with an authoritative Phase 16.1 document or the
current source, the Phase 16.1 document and current source win.

The Nocturne migration report predates commit `9e95cf7`. Its inline-theme
bootstrap description is superseded by the current client theme provider.

## 16. Claude Code First-Session Checklist

Run this before editing:

```powershell
Set-Location "C:\Users\moabu\Documents\Codex\Projects\dtgsa-mdr"
git status --short --branch
git log -8 --oneline --decorate
graphify query "What code and tests own the requested behavior?"
pnpm.cmd local:status
```

Then:

1. read the user request and identify the affected application/domain;
2. inspect the scoped Graphify result and authoritative docs;
3. read relevant source and tests;
4. read local Next.js documentation when Next.js behavior is involved;
5. make the smallest architecture-preserving change;
6. add or update regression coverage;
7. run required focused and repository gates;
8. run `graphify update .`;
9. inspect `git diff --check` and the staged diff;
10. commit and push only after verification;
11. leave the local runtime in the state requested by the owner.

## 17. Handoff Completion Criteria

A future handoff update is complete only when it records:

- the new authoritative commit and branch;
- a clean or explicitly explained Git status;
- implementation and behavioral changes;
- exact validation commands and results;
- schema or migration changes;
- provider or security boundary changes;
- remaining defects and external gates;
- local runtime status;
- whether a commit and push succeeded.

Do not claim completion based only on code edits. Verification, documentation,
Git state, and an honest statement of unverified boundaries are part of the
deliverable.

## 18. Ready-to-Paste Claude Code Kickoff

Use this message when opening a new Claude Code session:

```text
You are continuing the DTG Signature Platform in the authoritative repository:
C:\Users\moabu\Documents\Codex\Projects\dtgsa-mdr

Repository: moabuomar1889/dtgsa-mdr
Branch: codex/dtg-signature-platform-merge
Application baseline: 9e95cf764a9f7dd467bf65e4367296b22a6f6231

Before doing any work:
1. Read AGENTS.md.
2. Read docs/HANDOFF.md completely.
3. Run git status --short --branch and git log -8 --oneline --decorate.
4. Query Graphify for the requested behavior before broad source browsing.
5. Run pnpm.cmd local:status before starting, resetting, or cleaning services.

Preserve the PostgreSQL/Prisma-only architecture, provider boundaries,
server-side authorization, monorepo dependency rules, immutable evidence, and
database test safety rules documented in the handoff.

Do not use G:\My Drive\test\dtgsa-mdr. Do not add password login. Do not use
real Google, Drive, SMTP, production database, VPS, DNS, or deployment
credentials. Do not deploy, merge to main, force-push, amend commits, or modify
remote infrastructure without explicit owner authorization.

The current priorities are owner local UAT, reproducible defect correction,
regression coverage, and preservation of the completed Nocturne UI,
permission-aware navigation, and smooth client-side transitions.

For every implementation task, work end-to-end: inspect, implement, test,
update Graphify, review the diff, commit, and push verified work to the active
branch unless the owner instructs otherwise. Report exact validation results
and any remaining unverified boundary honestly.
```
