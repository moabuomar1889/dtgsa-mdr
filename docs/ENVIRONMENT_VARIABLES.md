# Environment Variables

Date: 2026-07-30

Status: `AUTHORITATIVE`

Example files contain names and safe placeholders only. Never commit secrets or
print unredacted connection URLs, private keys, token keys, Drive IDs, or
service credentials.

## Persistence

| Variable                 | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `DATABASE_URL`           | Prisma runtime or controlled migration connection   |
| `DIRECT_DATABASE_URL`    | Explicit direct connection when required by tooling |
| `MIGRATION_DATABASE_URL` | Least-privilege migration role                      |
| `RUNTIME_DATABASE_URL`   | Least-privilege application runtime role            |
| `READONLY_DATABASE_URL`  | Reporting/read-only role                            |
| `BACKUP_DATABASE_URL`    | Backup role                                         |

Test lifecycle scripts require a distinct loopback-only test URL and reject
remote hosts and production-like database names.

## Internal Identity

| Variable                           | Purpose                                           |
| ---------------------------------- | ------------------------------------------------- |
| `AUTH_MODE`                        | `GOOGLE_WORKSPACE` or `LOCAL_ACCEPTANCE_IDENTITY` |
| `LOCAL_ACCEPTANCE_MODE`            | Explicit local synthetic identity gate            |
| `AUTH_COOKIE_DOMAIN`               | Optional host-only-compatible cookie domain       |
| `GOOGLE_CLIENT_ID`                 | OIDC audience/client                              |
| `GOOGLE_CLIENT_SECRET`             | Server-side OAuth secret                          |
| `GOOGLE_REDIRECT_URI`              | Exact authorized callback                         |
| `GOOGLE_WORKSPACE_ALLOWED_DOMAINS` | Internal domain allowlist                         |
| `APP_ENCRYPTION_KEY`               | Transient PKCE and application encryption         |

Production requires `AUTH_MODE=GOOGLE_WORKSPACE`. Local mode is rejected in
production. Unknown modes and password-oriented configuration are not accepted.

## External Identity and Sessions

| Variable                       | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `MAGIC_LINK_SECRET`            | External invitation token key material |
| `INTERNAL_SESSION_TTL_MINUTES` | Internal session lifetime              |
| `EXTERNAL_SESSION_TTL_MINUTES` | External session lifetime              |
| `OIDC_TRANSACTION_TTL_MINUTES` | OIDC transaction lifetime              |
| `RECENT_AUTH_WINDOW_MINUTES`   | Formal-decision recent-auth window     |
| `MAGIC_LINK_TTL_MINUTES`       | External invitation lifetime           |

## Google Drive

| Variable                             | Purpose                    |
| ------------------------------------ | -------------------------- |
| `GOOGLE_DRIVE_SHARED_DRIVE_ID`       | Approved shared Drive      |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID`        | Restricted controlled root |
| `GOOGLE_DRIVE_SOURCE_ROOT_FOLDER_ID` | Restricted source root     |
| `GOOGLE_DRIVE_CLIENT_EMAIL`          | Service identity           |
| `GOOGLE_DRIVE_PRIVATE_KEY`           | Server-only service key    |

Local acceptance does not require these values and uses `.local-runtime`
filesystem roots. Drive identifiers and credentials must never reach browser
responses.

## Remaining Services

Email, webhook, signing, timestamp, malware, LibreOffice, qpdf, observability,
and build variables are documented by the corresponding runbooks and example
files. Live providers stay disabled until separately authorized.
