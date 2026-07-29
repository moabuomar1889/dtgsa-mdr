# Review Viewer Specification

Date: 2026-07-29

## Boundary

The approval viewer uses PDF.js in a narrow client island. It receives only a
platform file-object identifier and review-session identifier. Its same-origin
route proxies authorized requests to the existing controlled-file delivery
boundary. Google Drive URLs and IDs never reach the browser.

Every request reuses the internal session and every range is authorized by the
controlled delivery service. Responses retain private no-store, byte-range,
content-type, and MIME-sniffing protections and add same-origin resource and
content-security policies.

## Progressive Rendering

PDF.js requests 1 MiB ranges, disables automatic full-file fetching and stream
fallback, renders the requested page, and cleans page/document memory. The
domain contract prefetches only the current page plus two nearby pages. A
110 MiB test fixture proves the first request is less than one percent of the
file.

## Controls

The viewer supports previous/next and exact page navigation, zoom, fit width,
fit page, authorized download, keyboard focus, responsive layout, loading
status, and retry/offline language. Page search, thumbnails, and full-screen
are represented by the PDF.js architecture and remain safe client controls;
they do not change review authority.

## Review Evidence

Opening creates a user, step, and Package Hash-bound ReviewSession. The system
records first open, page-render events, last activity, bounded approximate
active seconds, declaration acceptance, completion, expiry, revocation, and
authorized download. It never claims that every page was read.
