# Graphify Baseline

Date: 2026-07-29
Repository: moabuomar1889/dtgsa-mdr
Implementation branch: codex/dtg-signature-platform-merge
Baseline commit: 05eb730a8f7e735a1254c1d1ba7e3133775d5ddc
Graphify version: 0.9.23

## Execution Summary

Graphify is installed at:

```text
C:\Users\moabu\.local\bin\graphify.exe
```

The first full run was attempted with:

```text
graphify . --no-viz
```

That run was blocked because the installed Graphify CLI required an LLM API key for 10 documentation files and 5 image files that needed semantic extraction.

The safe code-only baseline was then generated with:

```text
graphify . --code-only --no-viz
graphify cluster-only .
```

Generated evidence exists locally at:

```text
graphify-out/GRAPH_REPORT.md
graphify-out/graph.json
graphify-out/graph.html
```

Generated Graphify artifacts are not intended to be committed unless the DTG standard later requires it.

## Graph Summary

- Nodes: 976
- Edges: 2709
- Communities: 72
- Import cycles: none detected
- Extraction: 100% extracted code graph
- Token cost: 0 input, 0 output
- Semantic documentation/image extraction: blocked pending an approved LLM key or backend configuration

## Central Modules And God Nodes

Graphify identified these highly connected abstractions:

- `cn()` with 131 edges
- `requireCurrentAppUser()` with 99 edges
- `assertUserHasAnyPermission()` with 39 edges
- `Badge()` with 30 edges
- `Card()` with 27 edges
- `CardHeader()` with 27 edges
- `CardTitle()` with 27 edges
- `hasAnyPermission()` with 27 edges
- `CardDescription()` with 26 edges
- `CardContent()` with 26 edges

The most important architectural god node for the platform merge is `requireCurrentAppUser()`, because it bridges MDR pages, workflow services, authentication, Prisma access, PDF tools, RBAC, transmittals, cover generation, storage, templates, and document files.

## Current Domain Communities

Important communities from the baseline graph:

- MDR user interface and app routes around `mdr/page.tsx`
- Environment and runtime configuration around `env.ts`
- Client reply and numbering policies around `client-reply-service.ts`
- Prisma schema and migration community around `migration.sql`
- Authentication service around `auth-service.ts`
- Workflow constants and workflow service around `workflow-service.ts`
- Authorization vocabulary around `rbac.ts`
- PDF tools around `pdf-tools-service.ts` and `toolkit.ts`
- Transmittal service around `transmittal-service.ts`
- Cover generation around `cover-sheet-service.ts`
- Supabase storage and signature asset storage around `storage-service.ts`
- Template management around `template-management-service.ts`
- Google Drive document-file service around `document-file-service.ts`

## Coupling Observations

- Authentication is a central coupling point through `requireCurrentAppUser()`.
- Authorization is spread through permission helpers and service-level assertions.
- Storage coupling remains centered on Supabase storage helpers and optional Google Drive mirror behavior.
- Workflow coupling remains hardcoded around fixed service transitions and constants.
- PDF processing is currently in web-request scope through PDF service actions and cover package generation.
- UI primitives create graph noise, but domain-critical hubs are still visible.
- No import cycles were detected in the code-only graph.

## Candidate Package Boundaries

The graph supports these initial extraction boundaries:

- `packages/document-control-domain` for MDR, PDI, numbering, revision, transmittal, and client response policies.
- `packages/identity-domain` for Google Workspace identity, external Magic Link identity, user profile, and role snapshots.
- `packages/authorization` for RBAC, project/client scope, separation of duties, delegation, and override evaluation.
- `packages/workflow-engine` for workflow definitions, snapshots, approval cycles, sequential and parallel steps, and idempotent decisions.
- `packages/signature-domain` for signature appearance, approval evidence, package binding, declarations, and signing-provider interfaces.
- `packages/drive-adapter` for Google Picker handoff, controlled Drive copy, Drive File ID authority, reconciliation, and permission drift.
- `packages/controlled-documents` for one-main-file invariant, immutable file identity, hashes, and retention.
- `packages/pdf-engine` for inspect, render, cover, merge, QR, hash, and future seal operations.
- `packages/client-response-engine` for configurable response code policies, response files, and revision effects.
- `packages/audit-verification` for audit events, package manifests, platform seal, verification records, and tamper checks.

## Baseline Limitations

- The Graphify semantic pass did not run because no approved LLM backend was configured for documentation and image extraction.
- The baseline is therefore reliable for source-code structure, imports, function/class nodes, and code-level coupling, but not for extracting meaning from documents or screenshots.
- Community names were left as Graphify placeholders because no LLM backend was configured for label generation.

## Required Follow-Up

- Re-run Graphify with an approved backend before final architecture comparison.
- Run Graphify after every major extraction phase.
- Create `docs/GRAPHIFY_FINAL.md` after the final graph update.
- Compare dependency direction, package boundaries, god nodes, cycles, coupling reduction, and remaining violations.
