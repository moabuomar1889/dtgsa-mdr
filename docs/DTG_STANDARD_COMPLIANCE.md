# DTG Standard Compliance

Date: 2026-07-29

Status: `HISTORICAL_PHASE_15_SNAPSHOT`

Phase 16.1 supersedes provider-retirement statements in this document. Current
architecture is defined in
`docs/POSTGRESQL_PRISMA_ONLY_ARCHITECTURE.md`.

Repository: `moabuomar1889/dtgsa-mdr`

Branch: `codex/dtg-signature-platform-merge`

## Standard Version

```text
dtg-development-standards@e02dc9eb6db3f3c6e66e16b4bd8a50c731ce044f
```

The same value is recorded in `STANDARD_VERSION`. The inspected standards
commit exposes only a high-level README, so this report does not claim
compliance with unavailable detailed policies.

## Final Applied Controls

- Preserve the working MDR product through characterization tests.
- Use a dedicated implementation branch and one authoritative workspace.
- Maintain one pnpm lockfile and explicit package ownership.
- Enforce package direction, application isolation, public exports, and cycles.
- Keep Prisma schema and migration history authoritative at the root.
- Use additive migrations and preserve all legacy models.
- Enforce critical controlled-file, approval-cycle, published-version, and
  audit invariants in PostgreSQL.
- Keep database role templates password-free and least-privileged.
- Use loopback-only disposable PostgreSQL with redacted diagnostics and cleanup.
- Keep secrets out of Git, examples, logs, and operational responses.
- Do not claim live integrations or production deployment.
- Keep generated Graphify output ignored under repository policy.
- Separate internal OIDC and external Magic Link identities.
- Bind approval to controlled file, package hash, workflow snapshot, role,
  review evidence, identity snapshot, and immutable audit evidence.
- Keep service clients scoped, restricted, revocable, rate-limited, and unable
  to impersonate employees.
- Run heavy and external side effects through durable PostgreSQL jobs.
- Use non-root deployment units, private networking, migration locks, encrypted
  backups, integrity sidecars, and documented disaster recovery.
- Block release on critical/high dependency advisories and preserve evidence of
  security, architecture, migration, and documentation checks.

## Validation

The repository provides non-interactive commands for lint, strict typecheck, unit,
characterization, integration, full CI tests, architecture rules,
documentation, all deployment-unit builds, Prisma validation, and migration
validation.

The exact Phase 3 test counts and command results are recorded in
`docs/reports/PHASE_3_DATABASE_FOUNDATION_REPORT.md`. No test is intentionally
skipped.

## Security and External Systems

Google Workspace identity, Controlled Drive, approval evidence, package
manifests, application seals, verification, API, webhooks, General Requests,
durable jobs, and deployment configuration are implemented and locally tested.
Supabase compatibility remains materially used and cannot be removed before
production reconciliation. Live Google, Drive, provider, KMS/HSM, Coolify, DNS,
backup/restore, and production deployment remain externally blocked.

## Temporary Deviations

- Graphify semantic extraction remains unavailable without an approved backend.
- Detailed DTG standards remain unavailable at the recorded standards commit.
- PAdES is deferred and no certificate-backed digital-signature claim is made.
- Docker/container scanning and live staging recovery are unavailable locally.
- Dependency audit retains low/moderate maintenance items but no accepted
  critical/high release advisory.

## Remaining Gaps

The final compliance result is `PARTIALLY_COMPLETE` because the approved
standards repository exposes only a high-level README and because external
staging/production controls have not been exercised. No compliance is claimed
for unavailable requirements.
