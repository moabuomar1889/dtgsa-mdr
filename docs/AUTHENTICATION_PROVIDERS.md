# Authentication Providers

Date: 2026-07-30

Status: `AUTHORITATIVE`

## Supported Matrix

| Audience                | Environment                 | Provider                    | Password      |
| ----------------------- | --------------------------- | --------------------------- | ------------- |
| Internal employee       | Production/staging          | `GOOGLE_WORKSPACE`          | Not supported |
| Internal synthetic user | Local acceptance only       | `LOCAL_ACCEPTANCE_IDENTITY` | Not supported |
| External client         | All authorized environments | `MAGIC_LINK`                | Not supported |

## Google Workspace

The server uses Authorization Code flow with OIDC, state, nonce, PKCE, exact
redirect validation, issuer and audience checks, verified email, hosted-domain
checks, and immutable Google subject linking. Production fails closed unless
the mode is `GOOGLE_WORKSPACE` and all required configuration is valid.

## Local Acceptance

The local selector is enabled only when `AUTH_MODE=LOCAL_ACCEPTANCE_IDENTITY`,
`LOCAL_ACCEPTANCE_MODE=true`, and the environment is not production. It creates
the normal PostgreSQL-backed internal session and applies ordinary role,
permission, project-scope, CSRF, revocation, and audit checks.

## External Magic Links

Invitations, token hashes, expiry, single-use state, project/client scope, and
external sessions are PostgreSQL records. External identities never inherit
internal roles.

## Prohibited Behavior

There is no email/password login, password bootstrap, alternate session cookie,
provider JWT authorization, or compatibility authentication mode. Unknown
authentication modes are rejected by configuration validation.
