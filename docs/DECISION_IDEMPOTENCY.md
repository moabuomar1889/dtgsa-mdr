# Decision Idempotency

Every decision carries a globally unique idempotency key and expected step
state version. A serializable transaction claims the active step with one
compare-and-set update. The winner creates one decision, one Approval Evidence,
state transitions, and outbox events.

A repeated request with the same key returns the prior decision. Concurrent
duplicates resolve to the same record after unique/write-conflict handling. A
different key against the consumed state returns a safe conflict. Database
triggers make decisions immutable except for the one-time evidence link.

This closes `MDR-DEFECT-004`.
