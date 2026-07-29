# Database Foundation

Phase 3 adds a single PostgreSQL foundation for identity, controlled files,
workflow snapshots and cycles, cover versions, manifests and evidence, client
responses, comments, durable jobs, integrations, retention, and audit
integrity. Legacy MDR models remain readable and operational.

The new runtime engine is not activated. Current MDR transactions remain the
compatibility path except for the approved PDI defect corrections.

The additive schema contains 77 new models, bringing the combined legacy and
target schema to 119 models and 26 enums.

## Invariants

- One active controlled Main PDF per external revision.
- One active approval cycle per revision/content state.
- Published workflow, cover, and response-code versions are immutable.
- Audit rows are append-only at the database layer.
- Idempotency and verification hashes are unique.
- File identity uses provider key/Drive File ID, not path as authority.
