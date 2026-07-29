# ADR-005: Defer Heavy Build Orchestrator

Date: 2026-07-29

Status: Accepted for Phase 2

## Context

The initial workspace has thirteen buildable units, but no evidence yet that
remote caching or a separate task graph platform is required.

## Decision

Use pnpm recursive topological execution and explicit root commands. Do not add
Turborepo or Nx in Phase 2.

## Consequences

The build remains transparent and dependency-light. A later ADR may introduce
an orchestrator when measured CI time or graph complexity justifies it.
