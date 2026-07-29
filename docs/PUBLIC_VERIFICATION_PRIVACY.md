# Public Verification Privacy

Date: 2026-07-29

## Allowlist

Every project may version a `PublicVerificationPolicy`. It can independently
allow document number, revision, client, project, internal approval status,
client response status, final approval status, completion date, and package
match. Client and project names are hidden by default.

## Never Public

The public response never includes email addresses, employee private data,
approver names, raw Drive or storage identifiers, internal comments, IP or
session data, request fingerprints, sensitive audit payloads, reviewer names,
or response files.

## Abuse Resistance

Unknown, revoked, and expired codes use the same generic lookup failure.
Codes are non-sequential and only hashes are stored. Requests are limited to
twenty attempts per privacy-hashed fingerprint in ten minutes. Every accepted
attempt is logged without retaining the raw IP address or session identifier.

Public policy filtering happens after verification and before serialization.
Internal detail is served only by the authenticated MDR application after
project-role authorization.
