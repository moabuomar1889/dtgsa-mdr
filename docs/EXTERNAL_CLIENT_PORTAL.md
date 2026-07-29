# External Client Portal

Date: 2026-07-29

## Isolation

External contacts use a dedicated Magic Link identity, invitation, session,
cookie, CSRF token, route group, and server guard. External sessions never
inherit employee roles and cannot access internal approval, administration,
audit, report, or comment surfaces.

## Invitation Lifecycle

An authorized identity administrator creates an invitation scoped to one
client, optionally one project, and optionally selected PDI items. The service
generates a high-entropy token, stores only its SHA-256 hash, and passes the raw
token directly to the configured email adapter.

Invitations support expiry, one-time or controlled reusable use, attempt
limits, rate limiting, revocation, status, last use, and replacement. Replacing
an invitation revokes the old invitation and all sessions before delivering a
new token. A delivery failure leaves the replacement revoked rather than
persisting an active undelivered credential.

## Session and Scope Enforcement

Redemption atomically consumes a one-time invitation and creates a separately
hashed session token and CSRF token. Database-backed server guards validate:

- active invitation and session;
- active external identity;
- matching client;
- matching project when project-scoped;
- matching PDI item when item-scoped;
- CSRF on state-changing requests.

The client portal preserves `/portal` and `/portal/pdi`. PDI reads, updates,
and exports use the external session scope rather than internal user roles.

## Operations

The identity administration page shows invitation state and provides create,
replace/resend, and revoke actions. Audit records cover invitation creation,
replacement, revocation, login, and logout. Raw tokens and database passwords
must never be logged or included in reports.
