# Google Workspace Integration

Date: 2026-07-29

## Authentication Flow

Internal employees use a server-side OAuth 2.0 Authorization Code flow with
OpenID Connect. `/api/auth/google/start` creates state, nonce, and a PKCE
verifier. Only hashes of state and nonce are stored. The verifier is encrypted
with AES-256-GCM for the short lifetime of the authorization transaction.

The callback consumes the transaction exactly once, exchanges the code at the
official Google token endpoint, verifies the signed ID token through Google's
JWKS endpoint, and validates issuer, audience, nonce, expiry, verified email,
hosted domain, and configured email domain.

## Identity Authority

Google `sub` is the immutable identity authority. Email is profile and
account-linking data, not the persistent identity key. PostgreSQL prevents a
linked Google subject or its user-identity owner from being changed.

Automatic linking requires exactly one active local user with the exact
verified email and an approved Workspace domain. Ambiguous matches create an
admin review. An approved review is applied only after a fresh OIDC event with
the same subject fingerprint and email.

## Required Configuration

- `AUTH_MODE=GOOGLE_WORKSPACE` is mandatory in production.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` come from the approved OAuth
  client.
- `GOOGLE_REDIRECT_URI` must exactly match the configured callback.
- `GOOGLE_WORKSPACE_ALLOWED_DOMAINS` is a comma-separated allowlist.
- `APP_ENCRYPTION_KEY` encrypts transient PKCE material.

The authorized redirect path is:

```text
/api/auth/google/callback
```

## Directory Synchronization

The Directory adapter reads users and group memberships with read-only scopes.
Domain-wide delegation remains disabled unless
`GOOGLE_DIRECTORY_SYNC_ENABLED=true` and owner-authorized delegated service
credentials are present. Dry-run and deterministic fake adapters require no
Google credentials.

The synchronization reconciles profile fields, employee ID, department, job
title, group-derived roles, timestamps, errors, and incremental cursors.
Suspended accounts are deactivated, sessions are revoked, and open workflow
assignments are flagged for reassignment.

## Live Gate

No approved OAuth or delegated Directory credentials are present in this
workspace. Live staging verification is therefore
`BLOCKED_EXTERNAL_CREDENTIALS`. Code, contracts, local tests, and documentation
are complete, but production verification is not claimed.
