# Phase 13 Integrations and General Requests Report

Date: 2026-07-29

## Verdict

Phase 13 is code-complete and locally verified. The platform exposes a
versioned, scoped service API and typed server SDK. General Requests now cover
versioned form intake, attachments, durable PDF summary generation, assigned
human approval, evidence hashes, audit, search/history, and webhook events.

Live external endpoint, storage provider, and deployment-secret validation are
staging gates rather than local claims.

## Versioned API

`/api/v1` exposes documents, revisions, approval cases and steps, review
sessions, comments, client submissions/responses, downloads, verification,
general requests, integrations, and webhooks. OpenAPI is generated at
`/api/v1/openapi.json`. Errors and successful envelopes carry correlation IDs.

Individual case, request, and download status routes are supported. Mutations
use collection and case action routes. Output is bounded and recursively
sanitized.

## Scopes and Service Clients

Service clients use `clientKey.secret` Bearer credentials. Only SHA-256 secret
hashes are retained. Administration supports one-time issuance, rotation,
revocation, last use, explicit scopes, project/client restrictions, rate
limits, and request-attempt audit evidence. Integration comments record the
service client and never impersonate an employee.

Every primary and secondary query path, including review sessions, comments,
submissions, responses, and generated artifacts, resolves the project/client
boundary before serialization.

## Idempotency

Every POST requires `Idempotency-Key`. PostgreSQL stores client, endpoint
scope, key, canonical request hash, stable response, status, and expiry.
Equivalent retries return the original result; changed payloads return
`409 idempotency_payload_mismatch`.

## Webhooks

The eleven required event types use durable outbox and background jobs.
Endpoints must use public HTTPS and reject private, loopback, link-local, and
local DNS targets. Delivery signs the exact body with HMAC-SHA256, version,
timestamp, and immutable event ID.

Secrets are returned once, hashed for administration, and AES-256-GCM encrypted
for delivery with a deployment-owned key. Rotation, revocation, test delivery,
five-minute replay rejection, exponential retry, response history, and
eight-attempt dead letter are implemented.

## General Requests

`approve-web` provides `/requests` with seven initial templates: Leave,
Employee advance, Business trip, Overtime, Asset request, Employee
acknowledgement, and General administrative approval.

Forms are declarative, bounded, versioned, department-owned, and immutable
after publication. Arbitrary code is rejected. Submission atomically records
source metadata, purpose, classification, attachments, audit, case start, and
a durable summary job.

The worker creates a deterministic PDF summary and checksum. Approval is
blocked until the summary exists. Authorized department, project, or system
approvers accept a responsibility declaration and record approve, return, or
reject. The evidence binds request Package Hash, summary hash, step, actor,
decision, identity snapshot, audit, and webhook event.

## SDK and Integration UX

`@dtg/integration-sdk` provides typed create case, status, submit, comment,
download metadata, verify, General Request, client response, status badge, and
webhook verification helpers. It throws structured errors with correlation IDs.
No browser secret storage exists.

Accounting and HR examples document deep links, read-only source status,
webhook updates, and central ownership of signing. Source applications do not
duplicate review, signature, PDF, Drive, or evidence logic.

## Privacy

Serialization removes credential hashes, encrypted secrets, Drive identities,
provider paths, private identity snapshots, request/session metadata, internal
comments, and approval evidence. Download APIs return hashes and expiry
metadata rather than raw storage locations.

## Test Evidence

- Phase 13 focused unit scenarios: 11 passed.
- Complete unit and architecture command: 119 passed.
- Disposable PostgreSQL integration: 18 passed.
- Complete repository gate: 188 passed, 0 failed, skipped, or canceled.
- Fresh database and sequential upgrade: all 12 additive migrations passed.
- All 5 applications and all workspace packages built sequentially.
- Prisma validation, lint, typecheck, architecture, and route parity passed.
- Graphify update: 3,630 nodes, 6,625 edges, 342 communities.
- Required implementation commit:
  `58581fe38674e8dc69642ac82f57b341aecc0a03`.
- Approval-evidence completion commit:
  `ebc379c60215afb8ba7bbe2965f8b9b83280258a`.

## Operational Gates

Staging must supply `WEBHOOK_ENCRYPTION_KEY`, storage credentials, public HTTPS
callback destinations, production service-client issuance controls, reverse
proxy request identity, distributed rate limiting, monitoring, and backup.
No live external webhook was called and no production data was changed.

## Phase 14 Readiness

Ready. Phase 14 can package the five deployment units, define Coolify
networking and secrets, run migrations with a dedicated role, configure
monitoring and backup, and exercise live staging smoke tests. Production status
must remain classified as unverified until those external gates pass.
