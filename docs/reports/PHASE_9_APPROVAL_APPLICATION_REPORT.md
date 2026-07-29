# Phase 9 Approval Application Report

Date: 2026-07-29

## Verdict

Phase 9 is implementation-complete and locally verified. `approve-web` is now
the central internal review and decision surface rather than an operational
shell.

## Inbox

The server DAL builds assignment-scoped active, upcoming, returned,
clarification, completed, delegated, and overdue views with document, project,
client, role, due-date, comment, and progress context. Project filtering occurs
before DTO delivery.

## Viewer and Range Metrics

PDF.js renders behind the existing controlled file-delivery boundary. It uses
1 MiB byte ranges, disabled automatic full download, bounded nearby page
windows, memory cleanup, secure response headers, and no raw Drive identity. A
110 MiB fixture requests 1 MiB for first-page startup, below one percent.

## Review Sessions

Sessions bind user, workflow step, and exact Package Hash. First open,
page-render events, last activity, approximate active time, completion,
declaration, expiry, revocation, and authorized download are persisted.
Package changes revoke prior sessions. No claim is made that every page was
read.

## Comments

General, page, relative-area, and text findings support category, blocking
state, responsibility, due date, replies, attachments, timeline, resolution,
verification, closure, and reopen. Responsible assignees cannot close their
own blocking findings.

## Decisions, Signatures, and Returns

The decision action reauthenticates and verifies assignment, review session,
recent auth, exact Package Hash, declaration, blocking conditions, DC role,
state version, and idempotency inside a serializable transaction. It snapshots
identity, role, signature appearance version, workflow snapshot, request
session, and evidence hash without altering the Main PDF or claiming PAdES.
Returns require reason, responsible department, blocking findings, future due
date, and confirmation; prior evidence remains stored.

## MDR Integration

The shared internal session supports secure links from MDR with return
navigation. Decisions are recorded only in the central workflow tables and
published through outbox events; MDR remains a read-only progress consumer for
the configurable engine.

## Accessibility

The application provides labelled navigation and viewer controls, focusable
document canvas, status announcements, keyboard-compatible native controls,
responsive one-column critical flows, and clear empty, integrity, offline,
retry, and unauthenticated states.

## Tests

The gate covers inbox scope, state and search, 100 MiB first-page range,
virtualization, wrong user and package, expiry, relative annotations,
independent blocking closure, return requirements, no raw Drive leakage,
secure headers, accessibility markers, responsive CSS, database migration,
type checks, builds, lint, prior tests, and Graphify.

The complete repository gate passes 149 tests with zero failures, skips,
cancellations, or todo results. Fresh and upgrade migrations, workspace type
checks, lint, documentation and architecture validation, all production builds,
secret and diff checks, and Graphify pass. The MDR build was rerun alone after
a parallel Windows worker memory crash and passed.

## Phase 10 Readiness

Ready. Durable jobs can consume outbox events for rendering, package assembly,
delivery, retries, and operational metrics without moving decision authority
into the worker.

## Commit

Pending final implementation commit.
