# Audit Model

Hashed audit events use a project/global stream, contiguous sequence,
canonical event payload, previous hash, and current SHA-256 hash. The database
uniqueness constraint serializes competing sequence claims; callers retry a
conflict. Checkpoints record stream, sequence, hash, and event count.

The verifier recalculates every link and reports the first failed event.
Database triggers reject update or deletion of hashed events. This is
tamper-evident under database and access controls, not absolute immutability.
