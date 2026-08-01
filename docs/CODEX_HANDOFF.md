# Codex Handoff — DTGSA MDR

Date: 2026-08-01

Repository: `moabuomar1889/dtgsa-mdr`

Handoff commit: `34038e6997feb27aab26354eaddfe7c9832b8d1a`

This document is the entry brief for a Codex session. Everything in it was
verified against the working tree on the date above, not recalled. Where a
statement is unverified it says so explicitly.

Read `AGENTS.md` first, then this file, then `docs/HANDOFF.md` for the material
that predates this session.

---

## 1. Repository state

| Item | Value |
| --- | --- |
| Local workspace | `C:\Users\moabu\Documents\Codex\Projects\dtgsa-mdr` |
| Remote | `https://github.com/moabuomar1889/dtgsa-mdr.git` |
| Production branch | `main` @ `34038e6` |
| Staging branch | `staging` @ `34038e6` |
| Legacy branch | `codex/foundation-bootstrap` @ `05eb730a` |
| Database | PostgreSQL, Prisma only |
| Stack | Next.js 16.2.12, React 19, pnpm 11, Node 24 |

`main` and `staging` are the deployment branches the DTG Platform resolves.
Both currently point at the same commit. `codex/foundation-bootstrap` is a
strict ancestor of `main` with zero unique commits; it survives only because
GitHub refuses to delete the repository's default branch. See §7.

The branch `codex/dtg-signature-platform-merge` referenced by older documents no
longer exists; it was identical to `main` and was deleted.

---

## 2. Verification status

Every gate below was run at commit `34038e6` on 2026-08-01.

| Gate | Command | Result |
| --- | --- | --- |
| ESLint | `pnpm lint` | Pass |
| TypeScript | `pnpm typecheck` | Pass |
| Architecture | `pnpm check:architecture` | Pass |
| Documentation | `pnpm docs:validate` | Pass |
| Prisma schema | `pnpm exec prisma validate` | Pass |
| Unit + integration | `pnpm test:ci` | **204 passed, 0 failed** |
| Playwright | `pnpm test:e2e:local` | **5 passed** |
| Production builds | `pnpm build` | 3 Next apps compiled |
| Retired provider | `pnpm check:no-supabase` | **FAILS — see §7.1** |

The retired-provider gate is the only red gate and it is red for a true reason.
Do not "fix" it by weakening the check.

Status vocabulary is unchanged:

```text
FULL_LOCAL_ACCEPTANCE_COMPLETE
EXTERNAL_INTEGRATIONS_UNVERIFIED
SERVER_DEPLOYMENT_NOT_STARTED
```

---

## 3. What changed in this session

Six commits, oldest first.

### `a456a04` — streaming shell, authorization gaps, fabricated data

`(app)/layout.tsx` read the session, so Next.js blocked every client transition
on the layout render and `loading.tsx` could never show a fallback. The layout
now performs no runtime data access; the session is read inside Suspense-wrapped
shell slots and memoized per request with React `cache()`. `loading.tsx`,
`error.tsx` and `global-error.tsx` were added — the app previously had none.

**Authorization bypass closed.** `/mdr`, `/pdi`, `/clients`, `/masters` and
`/projects/new` enforced nothing server-side; only the sidebar hid them. A
`project.viewer` identity, holding `dashboard.view` alone, could read every one
of those registers by typing the URL. This was reproduced against the pre-fix
code before fixing.

Also removed: a hardcoded `3` notification badge, a hardcoded "68% configured"
progress bar, and an unread count derived from only the newest 50 rows.

### `b6dd3e5` — Nocturne prototype shell

Implements §4 of the design handoff in the Claude Design project
`Document Control System Design`. Header gained the project switcher, a labelled
theme control and one-click sign-out; the sidebar gained mono counts per module
row and the bottom-pinned submission-progress card, both on live data.

Design tokens already matched the prototype exactly — 18 of 25 byte-identical,
the rest differing only by whitespace or indirection. This was never a re-theme.

### `0080bf0` — UI weight audit

`docs/reports/UI_WEIGHT_AUDIT.md`. Measured, not estimated.

### `d2b90b3` — audit remediation

Removed a 428 KB Node `Buffer` polyfill from the browser, seven dead modules,
and six unused dependencies. Paginated both registers. Fixed two verification
gates that had blind spots.

### `711c988` — PDI workbook reconciliation

The core workflow change. Detailed in §4.

### `34038e6` — Cloudflare Access identity

Detailed in §5.

---

## 4. PDI workflow — the reconciliation contract

### 4.1 The defect this replaced

The exported workbook carried `DtgsaDocumentNumber`, but `normalizePdiImportRow`
never read it, and every row with a title went through `createPdiItem`.
Uploading the workbook a client returned therefore minted a **new internal
number for every row** and duplicated the entire register instead of filling in
the client numbers. The round trip the owner described was not implementable.

### 4.2 How the import behaves now

`apps/mdr-web/src/server/services/pdi/pdi-excel-service.ts`

Rows are matched against the register on **the internal number and the title
together**. This is a recorded owner decision, chosen over matching on the
number alone.

| Row condition | Outcome |
| --- | --- |
| Internal number matches, title matches, client number supplied, none recorded | `ClientNumberAssigned` |
| Internal number matches, title matches, identical client number already recorded | `Unchanged` (idempotent) |
| Internal number matches, title matches, **different** client number recorded | `Conflict` — numbers are immutable |
| Internal number matches, **title differs** | `Conflict` — never re-created |
| Internal number present but unknown to the project | `Conflict` |
| **No** internal number | `Added` — a line the client introduced |
| Coding-table value not resolvable | `Error` |

The title-mismatch case is the one that matters. Re-creating such a row would
mint a second internal number for the same document, which is precisely the
duplication this replaces. It is reported for a person to resolve.

Title comparison collapses whitespace and case, so a client retyping
`"  Single-Line  Diagram "` still matches.

### 4.3 Evidence

Every upload writes a `PdiImportRun` with the file name, its SHA-256, per-outcome
tallies, and a `PdiImportRunResult` row per workbook row. A register reconciled
dozens of times keeps the evidence of every round. After upload the operator is
redirected to `/pdi?import=<runId>`, which renders the reconciliation report.

### 4.4 Immutability

- `dtgsaDocumentNumber` — never changes.
- `clientDocumentNumber` — once recorded, replacing it is refused. Re-applying
  the identical value stays idempotent so the same workbook can be uploaded
  twice safely.
- `title` — the only field that may change, through `updatePdiItemTitle`, which
  requires a reason and records the previous value in the audit log. Refused
  once the item is promoted to the MDR.

### 4.5 Client and project configuration

- `Client.logoBase64` and friends hold the cover logo, exposed to templates as
  the `client.logo` binding. Held inline in PostgreSQL **by owner decision**,
  against the `AGENTS.md` rule that keeps file bytes out of the database. The
  service caps it at 256 KB and allows PNG, JPEG, WebP or SVG only, so it stays
  a brand asset. Do not widen this without a recorded decision.
- Cover generation is refused when the project has no PO or contract number.
  Project creation without one remains allowed — that split is deliberate and
  matches the owner's description. Only cover generation is gated; transmittals
  are not.

---

## 5. Identity — Cloudflare Access

**Do not implement application-level Google OAuth.** Do not add
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` or `GOOGLE_REDIRECT_URI` under
`AUTH_MODE=cloudflare_access`, and never request or store the central Google
OAuth client secret. Follow the DTG Application Identity Integration contract.

### 5.1 Runtime configuration

```dotenv
AUTH_MODE=cloudflare_access
CF_ACCESS_TEAM_DOMAIN=https://dtgsa.cloudflareaccess.com
CF_ACCESS_AUD=<provided by infrastructure — unique per hostname and environment>
ALLOWED_IDENTITY_DOMAIN=dtgsa.com
BOOTSTRAP_ADMIN_EMAIL=mo.abuomar@dtgsa.com
APP_URL=https://dc-app.dtgapps.cc
```

`CF_ACCESS_AUD` is **not set**. The application refuses to start under
`cloudflare_access` without it, which is intended. Production and staging must
use different audience tags; a token minted for one must not be accepted by the
other.

### 5.2 Validation

`server/services/identity/cloudflare-access-service.ts` fails closed at every
step: the `Cf-Access-Jwt-Assertion` header is required, the signature is verified
against the team's published keys through a bounded JWKS cache that refreshes on
an unfamiliar key id, the issuer must equal the team domain exactly, the audience
must equal this application's tag, the lifetime must be current, and a non-empty
email claim is required.

`Cf-Access-Authenticated-User-Email` is **never trusted on its own**. It is
exported only so a mismatch against the signed token can be detected.

The email is normalized to lowercase without whitespace, and the part after the
**final** `@` must equal `ALLOWED_IDENTITY_DOMAIN` exactly. Substring matching is
never used; the tests pin this with `notdtgsa.com` and `dtgsa.com.evil.tld`.

### 5.3 Authorization stays local

`server/services/identity/cloudflare-access-sign-in.ts`. A valid workforce
identity with no active local user record is denied with a message that does not
reveal whether any other address is registered, and the denial is recorded as a
sanitized system log that never contains the token. Only the explicitly
configured `BOOTSTRAP_ADMIN_EMAIL` is reconciled, idempotently.

### 5.4 Changed invariant

`AGENTS.md` previously stated production internal identity is
`GOOGLE_WORKSPACE`. It now states `CLOUDFLARE_ACCESS`, with `GOOGLE_WORKSPACE`
accepted only for environments not yet behind the edge. Synthetic local identity
remains barred from production.

---

## 6. Recorded decisions

These were decided by the owner after the trade-off was presented. Do not
silently reverse them.

| Decision | Consequence |
| --- | --- |
| Denied pages return **200** with the restricted state, not 403 | The shell streams before the permission check resolves, so the status is committed early. No unauthorized data is served either way. Removing `(app)/loading.tsx` restores 403 at the cost of blocking navigation — do not change one without the other. |
| PDI rows match on **number + title** | Chosen over number-only. The title-mismatch case is reported as a conflict rather than creating a duplicate. |
| Client logo stored **inline as base64** | Against the `AGENTS.md` no-bytes-in-PostgreSQL rule. Mitigated by a 256 KB cap and a mime allowlist. |
| PO gate blocks **cover generation only** | Project creation and transmittals remain possible without a contract number. |
| Icons remain **Lucide** | The design specifies Phosphor but its own handoff permits keeping one set app-wide. Do not mix. |

### 6.1 `force-dynamic` is load-bearing

All 44 routes keep `export const dynamic = "force-dynamic"`. This was tested:
removing it from `/dashboard` made Next.js attempt to prerender the route, run
Prisma queries at build time, and **fail the build**. Six routes reach the
database without reading `cookies()` directly. Do not remove it.

---

## 7. Outstanding items

### 7.1 `apps/mdr-web/.env` must be deleted

An untracked leftover holding retired-provider credentials, including a service
role key, and a dead `DATABASE_URL` pointing at a host that returns `ENOTFOUND`.
Next.js auto-loads it, so it silently overrode the database URL during builds —
this is how it was found.

`pnpm check:no-supabase` fails until it is removed:

```bash
rm apps/mdr-web/.env
```

It was left in place because it contains credentials and deleting it is the
owner's call.

### 7.2 Default branch and legacy branch

GitHub still lists `codex/foundation-bootstrap` as the repository default, which
is why it could not be deleted. Change the default to `main` in
Settings → Branches, then:

```bash
git push origin --delete codex/foundation-bootstrap
```

### 7.3 `CF_ACCESS_AUD`

Not set. Required before any Cloudflare Access environment can start.

### 7.4 Prototype work not yet ported

From `DTGSA MDR - Prototype.dc.html` in the Claude Design project:

- the **project-scoped information architecture** — the prototype scopes
  navigation to a selected project and adds a separate portfolio-level nav. This
  reshapes routing for every page and is the largest remaining piece.
- registers as CSS **grid** rather than `<table>`, per §4 of the design handoff;
- the document-detail, transmittal, PDI, portal and settings screens.

### 7.5 Unverified boundaries

Unchanged from `docs/HANDOFF.md` §13: live Google Workspace and Drive behaviour,
external email and webhooks, malware scanning, KMS/HSM signing, RFC 3161
timestamps, PAdES, public domains and TLS, container registry and deployment,
production database roles and recovery, and complete owner role-by-role UAT.

PAdES remains deferred. The local seal label is
`LOCAL DEVELOPMENT APPLICATION SEAL` and is not a production certificate.

---

## 8. Rules that must hold

1. Read `AGENTS.md` before working.
2. PostgreSQL and Prisma only. Migrations are additive; never edit an accepted
   one. `0002` and `0003` in this session are both additive.
3. Applications import shared code only through public `@dtg/*` exports.
   Subpaths declared in a package's own `exports` map are public — that is how
   `@dtg/client-response-domain/server` keeps `node:crypto` out of the browser.
4. **Server services must not import `page-access-service`.** It pulls
   `next/navigation` into modules the characterization suite loads under
   `--conditions=react-server`, where `React.createContext` does not exist.
   Pages call `requireUserHasAnyPermission` (raises `forbidden()`); services call
   `assertUserHasAnyPermission` (throws).
5. Authorization is enforced on the server for every protected route. Hiding a
   link is presentation only.
6. Never expose credentials, provider IDs, filesystem paths or private file URLs
   to the browser.
7. Run `pnpm check:architecture` after changing workspace dependencies or MDR
   routes, and `pnpm check:no-supabase` after changing source, configuration,
   dependencies, schema, tests or CI.
8. Do not deploy, force-push, or modify remote infrastructure without explicit
   owner authorization.

---

## 9. Local runtime

```bash
pnpm local:status
```

Services: MDR `3100`, approve `3101`, verify `3102`, API `4100`, email `4101`,
PostgreSQL `127.0.0.1:55432`. Identity selector at
`http://127.0.0.1:3100/local-acceptance` — there is no password; pick a synthetic
`@local.test` identity.

Two traps worth knowing:

- The runtime daemon can survive with dead children and still answer its control
  port, which makes `local:up` a silent no-op. If `local:status` reports RUNNING
  while the ports are closed, kill the daemon process directly.
- `assertLocalProviderConfiguration` scans **every** environment variable ending
  in `_URL`, so an unrelated inherited variable such as `ANTHROPIC_BASE_URL`
  fails `platform-api`, `worker` and `test:ci` startup with a loopback error.

Do not delete `.next` while the dev server is running; it corrupts the cache and
the server wedges mid-compile.

---

## 10. Performance notes

Development-mode figures are only comparable **within a single server
lifetime**. Do not compare a measurement taken in one session against another —
this produced a false regression during the session and cost real time to
disprove.

Production client baseline is 447 KB uncompressed / **129 KB gzip**, identical
on every authenticated route because the shell pulls it in. The rendered DOM is
light: 393–516 nodes, depth 15–18, and **no long tasks on any route**.

The heaviness felt locally is `next dev` shipping roughly eight times the
production payload across about thirty requests per navigation. It is not
present in a production build.
