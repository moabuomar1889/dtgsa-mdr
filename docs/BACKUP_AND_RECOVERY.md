# Backup and Recovery

PostgreSQL is the sole database authority. Production backups use the
least-privilege `dtg_signature_backup` role and include a custom PostgreSQL
dump, encryption, SHA-256 sidecar, and verified decrypted catalog. Retention is
14 daily, 8 weekly, and 12 monthly copies unless legal policy requires more.

Also preserve configuration versions, public signing-key registry, manifests,
evidence hashes, controlled Drive inventory, and operational configuration.
Drive files are not a database backup, and database dumps are not a file-store
backup. Private signing keys remain in KMS/HSM.

Local proof uses:

```powershell
pnpm local:backup-restore
```

It operates only on the embedded loopback database, restores into an isolated
local database, verifies schema/count/hash evidence, and writes ignored output
under `.local-runtime/backups`.

Production restore requires explicit owner authorization, an isolated restore
target, checksum verification, migration/count checks, complete smoke tests,
and known manifest/artifact hash verification. Never reset an operational
database to the clean baseline.
