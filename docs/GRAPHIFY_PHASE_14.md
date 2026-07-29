# Graphify Phase 14

Phase 14 adds deployment, CI, monitoring, backup, restore, smoke, and operations
artifacts without changing domain dependency direction. Deployment files sit
outside application/package ownership and invoke public workspace commands.
No application imports deployment code.

Run `graphify update .` after the operations commit and record final node, edge,
and community counts in the phase report.
