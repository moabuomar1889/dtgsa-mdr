# Database Constraints

- Partial unique index `ControlledMainFile_one_active_per_revision`.
- Partial unique index `ApprovalCycle_one_active_per_revision`.
- Published-version triggers on workflow, cover, and response-code versions
  and their mutable child content.
- Append-only trigger on `AuditLog`.
- Unique provider file identity, Drive File ID, manifest versions and items,
  package algorithms, decision idempotency keys, verification code hashes,
  integration keys, webhook deliveries, and job attempts.
- Legacy revision, document number, sequence, and role constraints are retained.

Soft deletion does not remove immutable evidence. The report claims
application/database immutability controls, not legal immutability.
