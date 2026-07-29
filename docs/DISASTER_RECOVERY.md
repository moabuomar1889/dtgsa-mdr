# Disaster Recovery

Targets are RPO 24 hours and RTO 8 hours initially; tighter targets require
measured continuous archiving. Restore order is network/DNS, PostgreSQL,
configuration and public keys, applications, worker, Drive reconciliation,
verification smoke, then traffic.

VPS loss uses replacement Coolify and immutable images. PostgreSQL loss uses the
latest verified encrypted backup. Drive permission loss pauses workflows and
restores least privilege; deletion uses Drive retention plus inventory
reconciliation. Signing outage queues sealing; key compromise revokes the key
and starts incident response without deleting evidence. Identity outage keeps
public verification available but blocks new internal approvals. Worker backlog
scales workers only after lease/dead-letter review. Secret compromise rotates,
revokes sessions/clients, and audits use.

No safe staging recovery exercise was run because no authorized staging
database or backup destination was supplied. Local scripts and disposable
database migration recovery are verified; the live exercise remains externally
blocked.
