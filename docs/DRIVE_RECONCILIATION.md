# Drive Reconciliation

Date: 2026-07-29

Periodic reconciliation reads each active controlled File ID and compares
existence, trash state, size, SHA-256, metadata, and permissions. Findings are
stored in `FileIntegrityCheck` and `ControlledStorageIssue`.

Security issue types are:

- `TAMPER_DETECTED`
- `PERMISSION_DRIFT`
- `MISSING_CONTROLLED_FILE`

Findings update the Main File integrity status, emit a security-alert outbox
event, and block platform delivery until resolved. Runs record checked and
mismatch counts. Resolution must be explicit and audited; reconciliation never
silently replaces controlled content.
