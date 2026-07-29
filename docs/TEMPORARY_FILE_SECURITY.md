# Temporary File Security

Date: 2026-07-29

Worker workspaces are created under the operating-system private temporary
root with unpredictable names. Components written to disk use AES-256-GCM,
per-workspace random keys held only in process memory, mode `0600`, normalized
filenames, and owned-path checks. The key is zeroed and the directory removed
in `finally`, including crash-path tests.

Generated downloads use a private temporary storage bucket, opaque cache-key
paths, no public serving, one-hour default TTL, authorization scope, and
explicit cleanup state. Retrieval rechecks authentication, project scope,
expiry, and file presence and uses `private, no-store` response headers.

Deployment defaults are a 2 GiB worker quota and 60-minute artifact TTL.
Cleanup scans bounded batches and records `Cleaned` or `CleanupFailed`. Startup
and scheduled cleanup recover residue after crashes.

Secure deletion cannot be guaranteed on SSDs, cloud object stores, snapshots,
or provider backups. Controls therefore rely on encryption, short retention,
access isolation, lifecycle deletion, and key disposal rather than unsupported
overwrite claims. No temporary object is authoritative.
