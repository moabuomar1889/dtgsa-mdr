# Local Manual Acceptance Guide

## Safety Boundary

This environment uses only synthetic data and loopback services. Do not add
Google, Supabase, SMTP, production database, company Drive, VPS, DNS, or
deployment credentials. The local dashboard must show `LOCAL DEVELOPMENT
APPLICATION SEAL`.

## Prerequisites

- Node.js 24 and pnpm 11.
- Windows x64 for the bundled embedded PostgreSQL package used on this owner
  workstation.
- Chromium installed by `pnpm exec playwright install chromium`.
- Portable qpdf 12.3.2 under `.local-runtime/tools/qpdf`. The official
  `qpdf-12.3.2-msvc64.zip` SHA-256 is
  `8941870a604e7c87ed24566b038d46c24ce76616254d2383c578f60c0677f202`.

## Start

```powershell
pnpm install
pnpm local:setup
pnpm local:demo
pnpm local:status
```

Open:

- MDR and local acceptance: `http://127.0.0.1:3100/local-acceptance`
- Approval: `http://127.0.0.1:3101`
- Verification: `http://127.0.0.1:3102`
- Platform API: `http://127.0.0.1:4100/health`
- Local email: `http://127.0.0.1:4101`

No password is used. Select a synthetic identity on the local acceptance page.
The selector creates the normal internal session and then applies the normal
role and project authorization checks.

## Main Workflow Checklist

Record Pass, Fail, or Not Tested for each section and include the page URL,
selected synthetic user, local time, and a screenshot for failures.

### A. PDI to MDR

1. Select `dc.operator@local.test`.
2. Open PDI, select `LOCAL-ALPHA`, and inspect the synthetic register.
3. Add/import a synthetic row, send it to the local client workflow, and use
   the Magic Link shown in the local email sink.
4. Enter a synthetic client number and promote the eligible item to MDR.
5. Expected: the MDR keeps PDI lineage, project scope, numbering, and audit.

### B. Cover and Workflow

1. Select `dc.admin@local.test` and open Templates.
2. Create a synthetic A4/A3 cover with Prepared By Manager, Reviewer,
   Approver, additional manager, DC Validator, and response legend.
3. Preview, publish, then create a new version.
4. Expected: the published version is immutable and historical records keep it.

### C. Controlled File

1. Select `dc.operator@local.test` and choose the generated 100 MiB fixture
   from the local source Drive.
2. Copy it to controlled storage, rename/move the source, and reopen it.
3. Expected: stable opaque identity, matching SHA-256/page count, one Main PDF,
   byte-range delivery, and no filesystem path or provider ID in the browser.

### D. Internal Approval

Use the account selector in this order:
`prepared.manager@local.test`, `reviewer@local.test`,
`approver@local.test`, `additional.manager@local.test`, and
`dc.validator@local.test`.

Expected: independent assignments, blocking comment/return/resolution,
recent-auth checks for formal decisions, complete audit evidence, signed
internal cover, and the local development seal.

### E. Separation of Duties

Assign the same synthetic person as preparer and reviewer. Expected: rejection.
Create an emergency override and approve it as a different administrator.
Expected: reason, scope, expiry, conflict marker, and no self-approval.

### F. Signed Internally

Request Signed Internally and watch worker status on the local dashboard.
Expected: signed cover, Main PDF, configured attachments, deterministic order,
SHA-256 evidence, temporary cleanup, local download, and verification.

### G-I. Client Responses

Exercise Code 2 correction, a rejected response, and Code 4 final approval.
Expected: immutable policy snapshots, preserved incoming files, accurate
labels, revision lineage, new Package Hash, no copied signatures, and lifecycle
closure only for the final code.

### J. Tamper

Use only the simulator fixture controls to change controlled bytes and run
reconciliation. Expected: `TAMPER_DETECTED`, blocked approval/download,
notification/audit evidence, and controlled recovery after restoring bytes.

### K. Identity Suspension

Suspend `approver@local.test` through the local identity simulator. Expected:
session revocation, signing denial, reassignment marker, and unchanged
historical approval evidence.

### L. General Requests

Test Leave, Advance, Business Trip, Overtime, Asset, Acknowledgement, and
Administrative Approval. Expected: captured form version, attachment/evidence,
summary PDF, Package Hash, human decision, history, and local webhook event.

### M. API Integration

Create a local service client, use its one-time secret only on loopback, repeat
a mutation with the same idempotency key, then change the payload. Expected:
same result for exact retry and HTTP 409 for conflict. Rotate/revoke the secret
and inspect HMAC delivery/replay rejection in the local receiver.

## Automated Evidence

```powershell
pnpm local:acceptance
pnpm test:e2e:local
pnpm local:qpdf
pnpm local:backup-restore
```

Evidence is written beneath `.local-runtime/artifacts`, `.local-runtime/backups`,
and `.local-runtime/screenshots`; these paths are Git-ignored.

## Reset, Stop, and Clean

```powershell
pnpm local:down
pnpm local:reset -- --confirm-local-reset
pnpm local:clean
```

`local:down` preserves the demo database. Reset requires the explicit
confirmation phrase and refuses paths outside `.local-runtime`.

## Report an Issue

Include the workflow letter, exact step, selected synthetic identity, expected
result, actual result, local timestamp, screenshot, and the relevant file from
`.local-runtime/logs`. Never include `.local-runtime/config.json` because it
contains local-only secrets.
