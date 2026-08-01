# DTGSA MDR Work Register

The Work Register turns user feedback into visible, traceable delivery work at
`/work-register`.

## User workflow

1. A signed-in user records a concise title, description, affected area,
   category, and impact.
2. The platform assigns an immutable `MDR-####` display identifier and records
   the reporter and creation event.
3. Users can add clarifications and examples to the item discussion.
4. Every participant can see status, ownership, work-pack grouping, evidence,
   deployment state, and remaining risks.

## Administration workflow

Platform administrators may triage, assign, group, and update items. Each update
requires a human-readable note and creates both activity history and an audit-log
entry.

An item cannot reach `Fixed`, `Verified`, or `Closed` without a fix summary, an
exact `file:line` reference, and test evidence. `Verified` additionally requires
a commit reference. `Closed` additionally requires a production deployment.

## Status meanings

- `Reported`: recorded and awaiting triage.
- `Investigating`: root cause is being established.
- `Planned`: the implementation path is understood and scheduled.
- `InProgress`: implementation is underway.
- `Blocked`: progress depends on a named decision, specification, or external
  condition.
- `Fixed`: code or configuration changed with implementation and test evidence.
- `Verified`: evidence and commit were independently checked.
- `Closed`: the verified fix reached production.
