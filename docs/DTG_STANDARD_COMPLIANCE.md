# DTG Standard Compliance

Date: 2026-07-29
Repository: moabuomar1889/dtgsa-mdr
Implementation branch: codex/dtg-signature-platform-merge

## Standard Version

The DTG development standards repository was reachable through Git and cloned temporarily for read-only inspection.

```text
dtg-development-standards@e02dc9eb6db3f3c6e66e16b4bd8a50c731ce044f
```

The same value is recorded in:

```text
STANDARD_VERSION
```

## Standard Content Read

The repository currently contains:

```text
README.md
```

The available standard text defines the repository as the source for DTG architecture standards, AI engineering rules, infrastructure standards, security policies, documentation standards, development workflows, provisioning architecture, quality gates, and reusable engineering assets.

No detailed rule files, checklists, schemas, or versioned policy documents were present in the cloned commit.

## Applied Rules

- Treat the existing MDR application as a working product, not a greenfield rewrite.
- Establish a dedicated implementation branch before architecture changes.
- Preserve current document-control behavior until characterization tests exist.
- Record the Graphify baseline before broad extraction.
- Record build, lint, Prisma, route, model, and migration state before major refactoring.
- Do not commit secrets.
- Do not claim external integrations are complete unless verified.
- Do not commit generated Graphify artifacts unless a DTG standard explicitly requires them.

## Repository Requirements

- Dedicated implementation branch was created: `codex/dtg-signature-platform-merge`.
- Current baseline commit was recorded: `05eb730a8f7e735a1254c1d1ba7e3133775d5ddc`.
- Current repository remote is `https://github.com/moabuomar1889/dtgsa-mdr.git`.
- A second local clone exists at `G:\My Drive\test\dtgsa-mdr`, but it is at older commit `1706f0967431c2cee4de6e1158fa6588cc7c2e11` and does not contain `docs/MDR_CODE_MERGE_REPORT.md`.

## Architecture Requirements

Current status:

- The repository remains a Next.js monolith.
- The target architecture is Option C, incremental modular monorepo.
- No app/package extraction has been performed in Phase 0.
- The baseline graph identifies the highest-risk coupling around identity, workflow, storage, PDF processing, and permission enforcement.

Required before implementation phases:

- Characterization tests must be added before refactoring core MDR behavior.
- Package boundaries must be introduced incrementally.
- Auth, storage, workflow, and signature boundaries must be replaced without deleting working MDR capabilities.

## Documentation Requirements

Created or updated in Phase 0:

- `docs/MDR_CODE_MERGE_REPORT.md`
- `docs/GRAPHIFY_BASELINE.md`
- `docs/DTG_STANDARD_COMPLIANCE.md`
- `docs/CURRENT_STATE.md`
- `docs/MERGE_IMPLEMENTATION_PLAN.md`
- `docs/reports/PHASE_0_BASELINE_REPORT.md`
- `STANDARD_VERSION`

Remaining required documentation is tracked in `docs/MERGE_IMPLEMENTATION_PLAN.md`.

## Security Requirements

Current security posture:

- Authentication is still Supabase password-based.
- Google Workspace SSO is not implemented.
- External Magic Link isolation is not implemented.
- Current signature event hash is not sufficient cryptographic evidence.
- Controlled Google Drive storage is not yet authoritative.
- No production seal or PAdES provider is configured.

Phase 0 did not modify security behavior. These items remain implementation requirements for later phases.

## Testing Requirements

Executed in Phase 0:

- ESLint: passed using `.\node_modules\.bin\eslint.cmd .`
- Prisma validation: passed using `.\node_modules\.bin\prisma.cmd validate`
- Next compile/typecheck mode: passed using `.\node_modules\.bin\next.cmd build --experimental-build-mode compile`
- Next production build: passed using `.\node_modules\.bin\next.cmd build`

Known gaps:

- No test script exists in `package.json`.
- No test/spec files were found.
- Characterization tests are not yet implemented.
- Migration tests against an empty database were not executed in Phase 0.

## CI/CD Requirements

Current status:

- No CI workflow was verified in Phase 0.
- No Docker or Coolify deployment files were added in Phase 0.
- No health endpoints were added in Phase 0.

Required later:

- Lint, typecheck, unit tests, integration tests, security tests, migration validation, production build, Docker build, and deployment checks.

## Approved Deviations

No owner-approved deviations are recorded yet.

## Temporary Deviations

- Graphify semantic extraction is blocked until an approved LLM backend or key is available.
- DTG standard details are limited because the standards repository currently exposes only a high-level README at the inspected commit.
- Work continues in the current Codex workspace path because it contains the latest inspected commit and baseline report. The Google Drive clone is behind by four commits.

## Remaining Compliance Gaps

- Add characterization tests.
- Add detailed target documentation.
- Introduce modular monorepo boundaries.
- Replace Supabase password auth with Google Workspace SSO for employees.
- Add external Magic Link auth for client users.
- Promote Google Drive File ID to primary external file identity.
- Add controlled document storage and one-main-file invariant.
- Add package manifests, package hashes, platform seal, and verification records.
- Add configurable workflow engine and separation-of-duties enforcement.
- Add worker/outbox model.
- Add CI/CD, deployment, backup, restore, and operational runbooks.
