# Backup and Recovery

Run `scripts/backup-postgres.sh` daily with a backup-role URL, age recipient,
offline recovery identity for verification, and encrypted off-site directory.
The script creates a custom PostgreSQL dump, encrypted artifact, SHA-256
sidecar, and validates the decrypted catalog. Retain 14 daily, 8 weekly, and 12
monthly copies, subject to legal retention.

Also export configuration versions, public signing-key registry, manifests,
evidence hashes, controlled Drive inventory, and operational configuration.
Google Drive is not the database backup. Private signing keys remain in
KMS/HSM and follow provider recovery policy.

Quarterly staging restore uses `scripts/restore-postgres.sh`, checks the
checksum, restores into an isolated database, validates migrations/counts,
runs the complete test/smoke suite, and verifies known manifest and artifact
hashes. Production restore requires explicit `ALLOW_PRODUCTION_RESTORE=true`
and owner authorization.
