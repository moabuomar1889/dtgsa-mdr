# ADR-001: Characterization Test Foundation

Date: 2026-07-29

Status: Accepted for Phase 1

## Context

The MDR application had no automated test command or test files before the staged DTG Signature Platform modernization. Phase 1 must protect current behavior without replacing the package manager, introducing a large framework stack, requiring production credentials, or connecting to production infrastructure.

The repository already includes TypeScript, Node.js 24, and `tsx`.

## Decision

Use the Node.js built-in test runner through the existing `tsx` dependency.

The test commands are:

```text
pnpm test
pnpm test:unit
pnpm test:characterization
pnpm test:integration
pnpm test:ci
```

Tests run non-interactively, serially, and with the `react-server` condition so server-only policy modules can be exercised without a Next.js request.

## Rationale

- No new test framework dependency or lockfile rewrite is required.
- The runner is deterministic and CI-compatible.
- TypeScript tests execute through the runtime already used by repository scripts.
- Node assertions and test skips provide exact pass, fail, and skip counts.
- Pure policies and generated sanitized fixtures cover behavior without external services.

## Consequences

- Deterministic policies and PDF/Excel utilities have fast local coverage.
- Database-backed behavior remains isolated behind a fail-closed safety guard.
- Integration tests are visible as skips until an approved disposable PostgreSQL test database is configured.
- Browser/component testing is outside Phase 1 because this phase characterizes server-side MDR behavior rather than redesigning the UI.

## Rejected Alternatives

- Vitest or Jest: capable, but unnecessary new framework dependencies for the current scope.
- Live production-like integration tests: rejected because they could connect to external data or infrastructure.
- Replacing direct Prisma calls during Phase 1: rejected because that would begin architectural extraction before behavior is characterized.
