# ADR-004: Independent Deployable Application Boundaries

Date: 2026-07-29

Status: Accepted for Phase 2

## Context

MDR, approval, verification, API, and asynchronous work have different trust,
scaling, and release characteristics.

## Decision

Create five separate application packages. Approval and verification use
Next.js. The API uses the Node.js HTTP module. The worker is a minimal Node.js
process. Each unit owns build, start, configuration, and health behavior.

## Consequences

Units can be deployed independently in a later phase. Phase 2 does not deploy
them and does not present foundation shells as implemented business products.
