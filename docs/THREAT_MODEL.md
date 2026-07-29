# Identity and Access Threat Model

Date: 2026-07-29

## Assets and Trust Boundaries

Protected assets include employee identities, project roles, PDI client data,
session credentials, recent-auth evidence, approval history, and audit
evidence. Trust boundaries exist between the browser and application, Google
OIDC and Directory APIs, email delivery, internal routes, external portal
routes, and PostgreSQL.

## Principal Threats and Controls

| Threat                                    | Control                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| OIDC request forgery                      | One-time state bound to an HttpOnly browser cookie                                   |
| ID-token replay or substitution           | Nonce, issuer, audience, expiry, JWKS signature, and transaction consumption         |
| Account takeover by email change          | Immutable Google `sub`; exact verified email only during reviewed linking            |
| Hosted-domain hint spoofing               | Verified ID-token claims plus email-domain and configured-domain equality            |
| Session fixation                          | New opaque token and revocation of the prior session on sign-in                      |
| CSRF                                      | Separate hashed CSRF token and SameSite policy                                       |
| Stolen database token                     | Only token hashes are persisted                                                      |
| Magic Link replay                         | Atomic one-time consumption, expiry, attempts, rate limit, and revocation            |
| Cross-client data access                  | Client/project/PDI scope checked in every portal service                             |
| External-to-internal privilege escalation | Separate identities, cookies, sessions, routes, and guards                           |
| Suspended employee action                 | Account deactivation, session/evidence revocation, approval guard, reassignment flag |
| Mapping tampering                         | Admin permission, audit, numbered snapshots, append-only database trigger            |
| Callback information disclosure           | Generic browser errors and no secret/token logging                                   |

## Residual Risks

Live Google configuration, organizational consent, redirect URI ownership,
email deliverability, delegated Directory access, and production cookie-domain
behavior require staging credentials and owner-controlled infrastructure.
These remain external verification gates, not locally proven controls.

## Controlled Drive Extension

Phase 5 adds server-side metadata validation against malicious Picker input,
opaque controlled names, File ID authority, no public-link API, restricted
permission reconciliation, hash/size/trash checks, integrity-blocked delivery,
range validation, no-store headers, resumable-part checksums, malware scanning
contract, and idempotent copy jobs. Residual risk remains in owner-controlled
Drive policy, delegated credentials, provider audit retention, malware
provider selection, and live large-file behavior.
# Phase 6 Cryptographic Threats

Canonicalization prevents representation ambiguity; protected field changes
alter Package Hash; key status is verified; insecure providers fail closed in
production; hashed audit rows are append-only under database controls. KMS/HSM,
PAdES, and trusted timestamp risks remain open until real providers are
configured and verified.
