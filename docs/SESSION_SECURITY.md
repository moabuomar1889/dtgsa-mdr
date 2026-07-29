# Session Security

Date: 2026-07-29

## Internal Sessions

Internal session tokens are opaque, high entropy, and stored only as hashes.
Successful OIDC authentication rotates any current session. Cookies are
HttpOnly, Secure in production, SameSite Lax, path-scoped, and optionally
domain-scoped. State-changing operations have a separately hashed SameSite
Strict CSRF token and require server-side validation.

Logout and account suspension revoke the session and all bound recent-auth
evidence. Server guards reject revoked, expired, inactive, or deleted users.

## Recent Authentication

Each Google sign-in creates evidence bound to the user, internal session, and
session-token hash. Signing phases can require evidence inside the configured
window and may consume it once. Expired, revoked, cross-session, or previously
consumed evidence is rejected. Forced reauthentication uses the Google start
route with `force=true`, `prompt=login`, and `max_age=0`.

## External Sessions

External sessions use different cookies and tables. Their token and CSRF token
are hashed independently. Invitation revocation and replacement revoke every
associated external session.

## Limits

Default values are 480 minutes for internal sessions, 60 minutes for external
sessions, 10 minutes for OIDC transactions, and 15 minutes for recent
authentication. Deployments may shorten these values through documented
environment variables.
