# Graphify Phase 10

Date: 2026-07-29

The Phase 10 graph adds `@dtg/job-engine` between web intent and worker
execution. MDR schedules signed-internal assembly and transmittal delivery;
the worker owns leases, attempts, storage adapters, PDF assembly, artifact
records, and cleanup. Controlled `FileObject`, `PackageManifest`,
`GeneratedCover`, `BackgroundJob`, `OutboxEvent`, `GeneratedArtifactRecord`,
`JobArtifact`, and `DeliveryAttempt` form the main evidence path.

Run `graphify update .` after code changes and use:

```text
graphify query "How does Signed Internally move from MDR request to temporary artifact download?"
```
