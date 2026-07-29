# Controlled File Lifecycle

Date: 2026-07-29

1. Working file selected through Picker.
2. Server validates authoritative Drive metadata.
3. Database reserves one active Main File and a copy job.
4. Worker claims the idempotent job.
5. Drive copies bytes to restricted controlled storage.
6. Platform calculates SHA-256 and PDF page count.
7. Permissions are reduced to approved administrative principals.
8. File becomes `Verified` and an outbox event is emitted.
9. Platform delivery authorizes by internal ID and supports byte ranges.
10. Reconciliation can mark `PermissionDrift`, `TamperDetected`, `Missing`, or
    `Trashed`; unresolved status blocks delivery and future approval use.

Rename or move updates snapshots only. Drive File ID remains authoritative.
Historical folder and file identities are preserved.
