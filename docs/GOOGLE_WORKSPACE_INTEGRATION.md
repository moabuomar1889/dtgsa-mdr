# Google Workspace Integration

Date: 2026-07-30

## Authentication Flow

Internal employees use server-side OAuth 2.0 Authorization Code flow with
OpenID Connect. `/api/auth/google/start` creates state, nonce, and PKCE. The
callback consumes the transaction once, exchanges the code, verifies the
signed ID token through Google JWKS, and validates issuer, audience, nonce,
expiry, verified email, hosted domain, and configured domain allowlist.

Google `sub` is the immutable identity authority. Email is profile/linking
data, not the persistent key. PostgreSQL owns identity links, sessions,
recent-auth evidence, roles, project scope, revocation, and audit records.

Production supports only `AUTH_MODE=GOOGLE_WORKSPACE`. The sign-in page starts
Google authentication and contains no password fields. Local acceptance is a
separate fail-closed synthetic mode and never calls Google.

## Directory Synchronization

The Directory adapter uses read-only scopes. Domain-wide delegation remains
disabled unless explicitly enabled with owner-authorized credentials. Dry-run
and deterministic fake adapters need no Google access. Suspended accounts are
deactivated, sessions revoked, and assignments flagged for reassignment.

## Live Gate

No authorized OAuth or delegated Directory credentials were used in Phase
16.1. Live verification is `BLOCKED_EXTERNAL_CREDENTIALS`; production readiness
is not claimed.
