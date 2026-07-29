# Role Mapping

Date: 2026-07-29

## Sources

Authorization preserves the existing role and permission vocabulary. Access
may originate from an active Google group mapping or an explicit audited user
override. A mapping may grant a system role or a role limited to one project
and may associate a department.

## Reconciliation

Directory synchronization resolves immutable Google group IDs to active
mappings. It creates only missing grants and tracks whether each grant was
created by synchronization. When membership disappears, only grants owned by
that mapping are removed; another active mapping or explicit override keeps
the role.

Mapping changes create append-only numbered snapshots and audit records.
PostgreSQL prevents version updates and deletes.

## Eligibility

The policy contract derives Prepared By Manager, reviewer, approver, DC
validator, and auditor eligibility from platform role codes. This contract is
available to later signing and workflow phases.

UI visibility is never authorization. Admin actions require role-management or
user-management permissions, and operational services continue to enforce
permissions and project scope on the server.
