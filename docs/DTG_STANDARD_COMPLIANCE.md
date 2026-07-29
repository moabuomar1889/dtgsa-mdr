# DTG Standard Compliance

Date: 2026-07-29

Repository: `moabuomar1889/dtgsa-mdr`

Branch: `codex/dtg-signature-platform-merge`

## Standard Version

```text
dtg-development-standards@e02dc9eb6db3f3c6e66e16b4bd8a50c731ce044f
```

The same value is recorded in `STANDARD_VERSION`. The inspected standards
commit exposes only a high-level README, so this report does not claim
compliance with unavailable detailed policies.

## Applied Phase 2 Controls

- Preserve the working MDR product through characterization tests.
- Use a dedicated implementation branch and one authoritative workspace.
- Maintain one pnpm lockfile and explicit package ownership.
- Enforce package direction, application isolation, public exports, and cycles.
- Keep Prisma schema and migration history authoritative at the root.
- Use loopback-only disposable PostgreSQL with redacted diagnostics and cleanup.
- Keep secrets out of Git, examples, logs, and operational responses.
- Do not claim live integrations or production deployment.
- Keep generated Graphify output ignored under repository policy.

## Validation

Phase 2 provides non-interactive commands for lint, strict typecheck, unit,
characterization, integration, full CI tests, architecture rules,
documentation, all deployment-unit builds, Prisma validation, and migration
validation.

The full expected suite is 73 tests: the previous 65 plus eight Phase 2
architecture/foundation tests. No test is intentionally skipped.

## Security and External Systems

Supabase remains the current MDR authentication and storage authority. Google
Workspace identity, controlled Google Drive, signature evidence, package
manifests, verification, production seals, Coolify, DNS, backup, and live
deployment are not implemented or connected in Phase 2.

The API exposes only health, readiness, and version metadata. The worker has no
jobs and makes no external calls. Approval and verification are truthful
foundation shells.

## Temporary Deviations

- Graphify semantic extraction remains unavailable without an approved backend.
- Detailed DTG standards remain unavailable at the recorded standards commit.
- Existing third-party declaration warnings are not treated as product code
  defects; the MDR app retains its pre-existing local declaration-skip setting.

## Remaining Gaps

Phases 3 through 15 own the target data model, identity, controlled storage,
manifest and evidence, configurable workflow, cover design, approval product,
worker jobs, responses and revisions, verification, integrations, operations,
security acceptance, and final consolidation.
