# General Requests

## Purpose

General Requests exposes the central approval and evidence foundation to HR,
Accounting, Procurement, EHS, QC, Operations, and Administration without
duplicating signature logic.

The initial request types are Leave, Employee advance, Business trip, Overtime,
Asset request, Employee acknowledgement, and General administrative approval.

## Form administration

Each type has department ownership and immutable versions. A version contains a
safe declarative field list and an optional workflow template. Allowed controls
are text, textarea, number, date, boolean, and bounded select. Keys are unique,
labels are required, field counts and lengths are bounded, and unknown submitted
fields are rejected. Script, expression, template execution, HTML, and arbitrary
code are not accepted.

Published versions are immutable at the PostgreSQL layer. Existing requests
continue to reference their captured version when a new draft or publication is
created.

## User workflow

1. The authenticated employee opens `/requests`.
2. The employee selects a request type, enters purpose, classification, source
   reference, declarative fields, and optional immutable attachment IDs.
3. Submission validates the published version and writes the request, audit
   event, outbox event, attachments, and durable summary job atomically.
4. The worker renders a deterministic PDF summary and records the immutable
   checksum and file object.
5. Central approvers process the request; source applications observe safe
   status or signed webhooks.
6. Search and history preserve number, purpose, source, status, and timestamps.

Approval requires the generated immutable summary, an active assigned step, a
responsibility declaration, and an authorized department, project, or system
role. The decision records identity, declaration, request Package Hash, summary
hash, evidence hash, audit, and an outbox event atomically. Final production
storage and live provider delivery depend on Phase 14 deployment adapters.
