# ADR-006: Phase 2 Package Ownership and Dependency Direction

Date: 2026-07-29

Status: Accepted for Phase 2

## Context

Shared folders without ownership rules would recreate monolithic coupling
inside a workspace.

## Decision

Assign narrow ownership to eight packages and make applications terminal
composition roots. Contracts are lowest-level. Configuration and observability
remain infrastructure-neutral. Database, authorization, PDF, UI, and document
policies expose public package entry points.

## Consequences

An automated validator rejects application imports from packages, cross-app
source imports, deep package imports, forbidden low-level dependencies, and
workspace cycles. Future package names remain documentation until real source
and validation exist.
