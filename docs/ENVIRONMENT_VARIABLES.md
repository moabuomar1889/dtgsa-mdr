# Environment Variables

Date: 2026-07-29

## Ownership

- `apps/mdr-web/.env`: local MDR runtime configuration. It remains ignored.
- Root `.env.example`: documented MDR variables without secrets.
- Each new application `.env.example`: only its Phase 2 operational metadata.
- `prisma.config.ts`: reads local MDR `.env`, then an optional root `.env`.
- Tests: construct synthetic loopback-only values in the lifecycle runner.

## Shared Build Metadata

| Variable | Required | Exposure | Default |
| --- | --- | --- | --- |
| `APP_ENVIRONMENT` | No | Server | `local` or `NODE_ENV` |
| `APP_VERSION` | No | Operational endpoint | `0.1.0` |
| `GIT_COMMIT_SHA` | No | Operational endpoint | `local` |
| `BUILD_TIME` | No | Operational endpoint | `local` |
| `PORT` | API only, optional | Server | Per-application local port |

## Safety

No Phase 2 endpoint returns credentials, database URLs, tokens, Drive IDs,
email configuration, or Supabase secrets. Browser-safe variables retain the
`NEXT_PUBLIC_` prefix. Server-only MDR variables remain owned by `mdr-web`.
No production credentials are included in examples.
