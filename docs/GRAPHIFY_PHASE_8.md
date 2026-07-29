# Graphify Phase 8

Date: 2026-07-29

Command:

```text
graphify update .
```

Result:

- 2,928 nodes
- 5,413 edges
- 261 communities
- 268 uncached code files re-extracted

The focused query links the server-only visual template service, designer route,
cover generation service, Phase 8 unit tests, and report. This confirms the
intended ownership boundary: Document Control UI and persistence remain in
`mdr-web`, reusable template behavior remains in `@dtg/cover-designer`, and
authoritative output remains in `@dtg/pdf-engine`.

The cover generation path resolves a published scoped snapshot, collects
workflow and client-response data, renders deterministic PDF bytes, stores the
controlled output, and records immutable generated-cover history. The legacy
template path remains adjacent as a compatibility fallback.
