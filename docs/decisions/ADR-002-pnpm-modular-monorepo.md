# ADR-002: Adopt pnpm Modular Monorepo

Date: 2026-07-29

Status: Accepted for Phase 2

## Context

The target platform requires multiple independently buildable applications and
shared ownership boundaries while preserving the working MDR application.

## Decision

Use the existing pnpm package manager with `apps/*` and `packages/*` workspaces,
one root lockfile, `workspace:*` internal dependencies, and root scripts for
orchestration.

## Consequences

Every unit has a manifest and TypeScript configuration. Workspace cycles fail
installation and architecture validation. Runtime dependencies remain declared
by their consuming units. No package-manager migration is required.

## Rejected Alternatives

- Separate repositories: rejected because the platform contracts and staged
  migration need atomic changes.
- npm, Yarn, or Bun workspaces: rejected because pnpm is already authoritative.
