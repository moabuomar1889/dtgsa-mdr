# Graphify Phase 13

Phase 13 adds two domain nodes: `@dtg/integration-domain` for security and
request policies, and `@dtg/integration-sdk` for source-system contracts.
`platform-api` depends inward on those contracts and `@dtg/database`.
`approve-web` owns authenticated General Request UX while `worker` owns summary
and webhook side effects.

The intended flow is:

```text
source backend -> integration-sdk -> platform-api -> PostgreSQL/outbox
authenticated user -> approve-web -> PostgreSQL/jobs
worker -> summary storage/webhook endpoint
```

No source application imports review, signature, Drive, PDF assembly, or
identity internals. The API does not expose provider identifiers or private
evidence. `graphify update .` is rerun at the phase gate; tool failures, if any,
are recorded in the phase report.
