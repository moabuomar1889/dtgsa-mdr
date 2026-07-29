# Environment Variables

Date: 2026-07-29

## Ownership and Safety

`apps/mdr-web/.env` owns local MDR runtime configuration and remains ignored.
Root and application example files contain names and safe defaults only.
Browser-visible values use `NEXT_PUBLIC_`; identity credentials and token keys
are server-only. Tests construct synthetic loopback-only values and print
redacted database URLs.

## Identity

| Variable                           | Required          | Default              | Purpose                                        |
| ---------------------------------- | ----------------- | -------------------- | ---------------------------------------------- |
| `AUTH_MODE`                        | Yes in deployment | `LEGACY_SUPABASE`    | Legacy, dual transition, or Google target mode |
| `AUTH_COOKIE_DOMAIN`               | No                | host-only            | Optional shared internal cookie domain         |
| `GOOGLE_CLIENT_ID`                 | Google modes      | none                 | OIDC audience and OAuth client                 |
| `GOOGLE_CLIENT_SECRET`             | Google modes      | none                 | Server-side code exchange                      |
| `GOOGLE_REDIRECT_URI`              | Google modes      | none                 | Exact callback URI                             |
| `GOOGLE_WORKSPACE_ALLOWED_DOMAINS` | Google modes      | none                 | Comma-separated domain allowlist               |
| `GOOGLE_DIRECTORY_SYNC_ENABLED`    | No                | `false`              | Explicit live Directory gate                   |
| `GOOGLE_ADMIN_EMAIL`               | Live Directory    | none                 | Delegated admin subject                        |
| `APP_ENCRYPTION_KEY`               | Yes               | none                 | Transient PKCE encryption                      |
| `MAGIC_LINK_SECRET`                | No                | `APP_ENCRYPTION_KEY` | Reserved external token key material           |

Production refuses `LEGACY_SUPABASE` and `DUAL_TRANSITION`, even if legacy
Supabase variables remain configured.

## Session Windows

| Variable                       | Default |
| ------------------------------ | ------- |
| `INTERNAL_SESSION_TTL_MINUTES` | `480`   |
| `EXTERNAL_SESSION_TTL_MINUTES` | `60`    |
| `OIDC_TRANSACTION_TTL_MINUTES` | `10`    |
| `RECENT_AUTH_WINDOW_MINUTES`   | `15`    |
| `MAGIC_LINK_TTL_MINUTES`       | `30`    |

All values must be positive integers. Production should shorten windows where
the operating policy requires stronger assurance.

## Existing Services

Supabase, Google Drive, email, LibreOffice, database, upload, and build metadata
variables remain documented in `.env.example`. Phase 4 does not print, return,
or commit their secret values. Google Directory reuses the existing delegated
service-account key variables but remains disabled by default.
