# ADR-003: Preserve MDR Through Compatibility Exports

Date: 2026-07-29

Status: Accepted for Phase 2

## Context

Moving characterized policies directly to packages could require a risky broad
rewrite of current MDR consumers.

## Decision

Keep old application import paths as documented re-export files. The new
package owns the only implementation. Representative exports are identity
tested.

## Consequences

The MDR remains executable while package adoption can proceed incrementally.
Compatibility files are temporary debt with explicit future removal phases.
Circular compatibility imports are prohibited.
