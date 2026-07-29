# ADR: Remove the Retired Backend Provider

Date: 2026-07-30

Status: `ACCEPTED`

## Context

The platform already used PostgreSQL and Prisma for domain persistence, but a
retired backend provider still supplied password authentication, session
compatibility, object storage, SDK dependencies, environment variables, and
fallback paths. Keeping two authorities increased failure modes, secret
surface, browser bundle size, and operational ambiguity.

## Decision

Remove that provider completely from active source, configuration, tests,
database schema, migration history, UI, and lockfile. Internal production
identity is Google Workspace OIDC; local identity is synthetic and
loopback-only; external identity is PostgreSQL-backed Magic Link. Production
files use Google Drive and local acceptance uses filesystem adapters.

A repository gate rejects reintroduction in active source and CI. Historical
reports remain unchanged because they are evidence of earlier architecture.

## Consequences

The platform has one database authority and one migration authority. Password
login and provider fallback are intentionally unavailable. A rollback would
require a new owner-approved architecture decision rather than activating
dormant compatibility code. Live Google and Drive verification remains an
external staging gate and is not claimed by this local phase.
