# MDR Web UI Weight Audit

Date: 2026-07-31

Baseline commit: `b6dd3e5`

Application: `apps/mdr-web`

## 1. Summary

The rendered UI is not heavy. The DOM is small, there is no measurable main
thread blocking, and the production client baseline is ordinary for React 19 and
Next.js 16.

Two real problems were found:

1. A 428 KB Node `Buffer` polyfill is shipped to the browser on `/replies` and
   `/templates/designer`, roughly doubling the client payload on those routes.
   It is pulled in by two client components that import server-side domain
   packages.
2. Six client modules are dead, three of which are the only consumers of
   `recharts` and `@tanstack/react-table`.

The heaviness that is felt day to day is the development server, which ships
about eight times the production payload across roughly thirty requests per
navigation. That is expected `next dev` behaviour and is not present in a
production build.

## 2. Method

All figures were measured, not estimated.

| Measurement | How |
| --- | --- |
| Production per-route payload | Chunk sets read from each route's `build-manifest.json` under `.next/server/app`, summed from the real file sizes on disk |
| Gzip sizes | `zlib.gzipSync` over the same chunk files |
| Chunk contents | String fingerprinting of the emitted chunks, plus a word-frequency fingerprint for the unidentified one |
| Dev payload | Chrome DevTools Protocol `Network.loadingFinished.encodedDataLength` with the HTTP cache disabled |
| DOM and timing | `performance` navigation, paint, and longtask entries in the running page |

Development figures come from the local runtime on port 3100 and are only
comparable within a single server lifetime.

## 3. Production client payload

Every authenticated route loads an identical set of five chunks:

```text
447 KB uncompressed / 129 KB gzip
```

That set is React DOM, the Next.js App Router runtime, the Radix primitives used
by the shell, and Lucide. It does not vary by route, because the shell is what
pulls it in. 129 KB gzip is a normal baseline for this stack and is not the
cause of the reported heaviness.

### 3.1 Defect: Node `Buffer` polyfill in the browser

One chunk of 428 KB uncompressed (128 KB gzip) is a Node `Buffer` polyfill —
identified from `SlowBuffer`, `isBuffer`, `utf16le`, `readUInt16BE`, and
`fromByteArray`. It is referenced by exactly two routes:

```text
.next/server/app/(app)/replies/page_client-reference-manifest.js
.next/server/app/(app)/templates/designer/page_client-reference-manifest.js
```

Cause: two client components import workspace domain packages, and both of those
packages import `node:crypto`. The bundler then polyfills Node for the browser.

| Client component | Imports | Package imports |
| --- | --- | --- |
| `components/app/client-response-form.tsx` | `CLIENT_RESPONSE_FILE_KINDS` from `@dtg/client-response-domain` | `node:crypto` |
| `components/cover-designer/cover-designer-workspace.tsx` | several symbols from `@dtg/cover-designer` | `node:crypto` |

The first case needs one constant array. The second needs types and a small
number of pure helpers. Neither needs `node:crypto`, and neither should be
loading a Buffer implementation in a browser.

Effect: `/replies` and `/templates/designer` pay roughly double the client
payload of every other route.

Recommended fix: move the browser-safe constants and types into a module that
does not import `node:crypto`, and keep the hashing helpers in a server-only
entry point. This is a packaging change inside `packages/*`, not a UI change.

## 4. Rendered UI cost

Measured on the running app, per route:

| Route | DOM nodes | Max depth | FCP | Long tasks |
| --- | --- | --- | --- | --- |
| `/dashboard` | 516 | 15 | 92 ms | 0 ms |
| `/mdr` | 417 | 18 | 92 ms | 0 ms |
| `/pdi` | 495 | 17 | 92 ms | 0 ms |
| `/transmittals` | 413 | 15 | 108 ms | 0 ms |
| `/replies` | 408 | 15 | 108 ms | 0 ms |
| `/reports` | 429 | 17 | 240 ms | 0 ms |
| `/tasks` | 396 | 15 | 116 ms | 0 ms |
| `/projects` | 429 | 16 | 92 ms | 0 ms |
| `/settings` | 457 | 16 | 84 ms | 0 ms |
| `/templates/designer` | 393 | 15 | 92 ms | 0 ms |

Nothing here is heavy. Roughly 400 to 520 nodes at depth 15 to 18 is a light
document, and no route recorded a single long task. The registers are small in
the local demo dataset; these numbers will grow with real row counts, which is
what section 6 addresses.

## 5. Development server cost

This is what is felt while working locally.

| Route | Total downloaded | Requests | JavaScript | JS requests |
| --- | --- | --- | --- | --- |
| `/dashboard` | 1013 KB | 29 | 982 KB | 28 |
| `/mdr` | 1022 KB | 32 | 994 KB | 31 |
| `/replies` | 1198 KB | 35 | 1172 KB | 34 |
| `/templates/designer` | 1202 KB | 35 | 1177 KB | 34 |

Against a 129 KB gzip production baseline, development ships roughly eight times
the bytes over roughly thirty separate requests, unminified and with source maps
and the HMR client attached. This is normal `next dev` behaviour.

Consequence for judgement: do not tune the UI against development numbers, and
do not compare a development measurement taken in one server lifetime against
one taken in another.

## 6. Dead client modules

Six client modules are imported by nothing:

```text
components/chart-area-interactive.tsx
components/data-table.tsx
components/section-cards.tsx
components/nav-documents.tsx
components/app/client-reply-form.tsx
components/dtg/dialog.tsx
```

`chart-area-interactive.tsx` and `data-table.tsx` are the only consumers of
`recharts` and `@tanstack/react-table` respectively. Neither library appears in
any emitted chunk, so they cost nothing at runtime today — they are unused
dependency and maintenance weight, and they are a trap: importing either file
once would add a large chunk with no warning.

`components/dtg/chart.tsx` is only reachable through those two orphans.

## 7. Ranked recommendations

| # | Change | Effect | Risk |
| --- | --- | --- | --- |
| 1 | Split browser-safe constants and types out of `@dtg/client-response-domain` and `@dtg/cover-designer` so no client component reaches `node:crypto` | Removes 428 KB / 128 KB gzip from two routes | Low; packaging only |
| 2 | Delete the six dead client modules, then drop `recharts` and `@tanstack/react-table` if nothing else uses them | Removes dead code and two large dependencies | Low |
| 3 | Paginate the MDR and PDI registers in the UI | Both services are already capped at 200 rows server-side, but the pages render every row; DOM cost grows linearly with real data | Medium; changes a user-facing surface |
| 4 | Reconsider `force-dynamic` on all 44 routes | Prevents any static shell and any router caching between navigations | Medium; interacts with the streaming and denial-status decisions recorded in `HANDOFF.md` §9 |

Items 1 and 2 are contained and safe. Item 3 matters only once real registers are
loaded. Item 4 should not be attempted without re-reading the recorded decision
on denial status under streaming.

## 8. What was not found

- No layout thrashing, and no long tasks on any route.
- No oversized images; the UI ships none.
- No blocking third-party requests; the earlier acceptance test already asserts
  zero external requests.
- No duplicated React or Radix copies in the emitted chunks.
- `recharts` is not shipped to the browser on any route.

## 9. Remediation applied

All four ranked items were actioned on 2026-08-01.

| # | Outcome |
| --- | --- |
| 1 | Done. `@dtg/client-response-domain` and `@dtg/cover-designer` each gained a `./server` entry holding the `node:crypto` hashing function; the package root is now browser-safe. The Buffer polyfill is gone from every chunk and total client JS fell from 1.6 MB to 1.1 MB. |
| 2 | Done. Seven dead modules removed, and `recharts`, `@tanstack/react-table` and all four `@dnd-kit` packages uninstalled — 43 packages dropped from the lockfile. |
| 3 | Done. Both registers paginate at 50 rows with URL-driven paging and no client JavaScript. |
| 4 | Rejected, with evidence. See below. |

### 9.1 `force-dynamic` is load-bearing, not redundant

Removing `export const dynamic = "force-dynamic"` from `/dashboard` and building
made Next.js attempt to prerender the route at build time, which executed Prisma
queries during the build and failed it outright. Six routes reach the database
without reading `cookies()` directly, so the declaration is what keeps them out
of the static prerender pass. It stays on all 44 routes.

### 9.2 Register counts were reported from the page, not the register

Found while paginating: both registers derived their headline counts from the
rows just fetched, so the 200-row cap silently capped the counts too. Counts now
come from `groupBy` aggregates over the whole register and are correct
independently of the page in hand.

### 9.3 Two verification gates had blind spots

- `check:no-supabase` listed `.env` among the extensions it scans, but
  `extname(".env")` is an empty string, so a file named exactly `.env` was never
  read. Fixed to match environment dotfiles by name. It now reports
  `apps/mdr-web/.env`, an untracked leftover holding retired-provider
  credentials that also overrode `DATABASE_URL` during builds.
- `check:architecture` rejected every `@dtg/<pkg>/<subpath>` import as a deep
  import. A subpath declared in the package's own `exports` map is public API,
  which is how a package offers a server-only entry point at all. The validator
  now consults the target manifest and still rejects undeclared subpaths.

## 10. Verification

- Evidence source: production build of `apps/mdr-web` at commit `b6dd3e5`, and
  the local runtime on `127.0.0.1:3100`.
- Development figures are development-mode only.
- No source changes were made while producing this report.
