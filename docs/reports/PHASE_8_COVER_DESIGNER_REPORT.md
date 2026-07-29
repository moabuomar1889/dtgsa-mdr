# Phase 8 Cover Designer Report

Date: 2026-07-29

## Verdict

Phase 8 is implementation-complete and locally verified. Document Control can
create, clone, edit, preview, validate, publish, supersede, and archive
structured visual cover versions.

## Designer UI

The server-owned `/templates/designer` route exposes a focused client designer
island with page-size and orientation contracts, grid and snapping, alignment
guide, zoom, multi-select, drag, exact geometry, layer order, lock, duplicate,
undo/redo, sample preview, validation, save, and publish.

## Element and Binding Schema

`@dtg/cover-designer` defines 18 structured element types and an explicit
allowlist for client, project, document, workflow, signer, response, and
verification fields. Relative coordinates keep storage resolution-independent.
Invalid bindings, geometry, pages, signatures, and duplicate IDs fail
validation.

## Inheritance and Versioning

Resolution follows organization, client, project, document type, and discipline
specificity. Scope IDs are verified against their declared type. PostgreSQL
enforces immutable published, superseded, and archived content. Every
publication has a stable snapshot and content hash; later publication
supersedes but does not alter prior history.

## Signature Boxes and Prepared By

Signature boxes bind to workflow step keys and role labels, with optional
specific assignments. Prepared By Manager is mandatory and visible. The PDF
contains signer identity, appearance, signing date, role context, decision, and
evidence reference. Appearance bytes are not treated as approval authority.

## Client Legend

The client response legend is loaded from the project's published code-set
version. Exact external codes and wording are rendered dynamically, supporting
letters, text, omission, and project-specific differences without a hardcoded
1-5 model.

## Rendering and History

`@dtg/pdf-engine` produces deterministic PDFs directly, with lawful standard
fonts, actual QR symbols, correct dimensions, overflow rejection, aspect-ratio
image placement, safe text, and output hashing. Generated covers store exact
template and workflow snapshots, template and output hashes, renderer version,
and immutable file-object identity.

## Legacy Compatibility

Managed DOCX/LibreOffice cover rendering remains available when no visual
template resolves. The existing generated-PDF path remains the final fallback.
No destructive legacy migration was performed.

## Security

Administration requires template permission at the page, action, and service
boundaries. SVG active content and external references are rejected, image
sizes are bounded, bindings cannot execute code, published mutations fail in
PostgreSQL, changes are audited, and raw signature storage URLs never cross the
server boundary.

## Test Results

The Phase 8 gate covers inheritance, scope validation, publication
immutability, historical snapshots, bindings, relative coordinates, page
dimensions, Prepared By, multiple managers, project legends, overflow, QR,
signature appearance snapshots, deterministic output, permissions, reducer
history, fresh migrations, upgrade migrations, integration behavior, type
checking, lint, builds, documentation, architecture, secrets, and Graphify.

The complete repository gate passes 142 tests with zero failures, skips,
cancellations, or todo results. Fresh and upgrade migrations, all workspace
type checks and production builds, lint, documentation validation,
architecture validation, Prisma validation, formatting, and Graphify pass.

## Phase 9 Readiness

Ready. The approval application can consume immutable workflow snapshots,
Package Hash review eligibility, server-controlled signature evidence, and
versioned visual covers without owning cover layout.

## Commit

Pending final implementation commit.
