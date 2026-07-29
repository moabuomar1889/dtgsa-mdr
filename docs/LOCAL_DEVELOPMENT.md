# Local Development

Date: 2026-07-30

## Safety

Local development uses embedded PostgreSQL, synthetic identities and data, and
filesystem providers beneath ignored `.local-runtime`. It must not receive
production/staging database URLs, Google credentials, company Drive IDs, email
credentials, VPS access, DNS access, or deployment credentials.

## Setup and Run

```powershell
$env:CI='true'
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm local:clean
pnpm local:setup
pnpm local:seed
pnpm local:demo
pnpm local:status
```

Open `http://127.0.0.1:3100/local-acceptance` and select a synthetic identity.
No password is used. The remaining apps run on loopback ports 3101, 3102, 4100,
and 4101.

## Validate and Stop

```powershell
pnpm local:acceptance
pnpm test:e2e:local
pnpm local:qpdf
pnpm local:backup-restore
pnpm local:down
```

`local:down` preserves data. `local:clean` removes only the validated
`.local-runtime` tree. Database test commands independently create and delete a
disposable loopback PostgreSQL instance in `finally`.
