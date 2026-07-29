# Phase 11 Client Responses and Revisions Report

Date: 2026-07-29

## Verdict

Phase 11 is code-complete and locally verified. Client and project response
policies are configurable, versioned, immutable after publication, and
resolved without numeric-code branching. Response evidence, policy snapshots,
files, submission identity, revision lineage, dynamic downloads, search, and
audit history are preserved.

Live object-storage, malware-provider, and large response-package behavior
remain staging gates and are not represented as production-verified.

## Policies and Fixtures

Document Control can create client defaults, clone policies for projects,
create later draft versions, add, remove, and reorder numeric, letter, or text
codes, configure twelve independent effects, upload procedure/sample
references, validate, publish, and supersede versions. Project overrides take
precedence over the client default. Published version and child code content
are protected by PostgreSQL triggers.

Three development-only fixtures provide ten example definitions:

- Air Products style: four codes.
- JIGPC style: five codes.
- Conditional Code 2: one project example.

Fixtures are disabled in production and never become global rules.

## Response Files and History

Registration selects one exact `ClientSubmission`, one published code, an
incoming reference, dates, optional reviewer evidence, comments, one primary
file, and zero or more attachments. Seven primary file kinds are supported.
Every file is privately stored and SHA-256 hashed. Each response snapshots
exact wording, label, version, policy hash, and independent effects.

Multiple responses per submission/revision remain historical. Only the latest
active response drives current status. Rejected outcomes cannot be approved;
final approval closes only when the published effects permit closure. The
history view exposes files, policy hash, effects, active/history state,
revision-required and overdue filters, and global scoped search.

## Revision Wizard

The guided action reads the response's effects snapshot, preserves the base
document number and stable document metadata, calculates the next revision,
links parent revision and source response, references unresolved comments,
stores and hashes one new controlled Main PDF, creates a new manifest and
Package Hash, supersedes the prior revision, reseeds workflow from Prepared By
Manager, and resets the document to Draft.

Old manifests, hashes, decisions, responses, and files remain unchanged.
Signatures and approval decisions are never copied; workflow and audit evidence
record `signaturesCopied: false`.

## Dynamic Downloads

The UI queues a label derived from the actual policy:

```text
Client Response - <configured internal label>
```

`PDF_ASSEMBLE_CLIENT_RESPONSE` selects components by primary file kind. Cover
and comment-sheet profiles use the exact Main PDF recorded on that client
submission, not a later current revision. Worker assembly verifies component
hashes, uses encrypted temporary storage, and creates one private expiring
`GeneratedArtifactRecord`. It does not permanently duplicate the controlled
Main PDF.

## Verification Metrics

- Phase 11 unit scenarios: 9 passed.
- Complete unit and architecture command: 104 passed, 0 failed.
- Disposable PostgreSQL integration: 16 passed, 0 failed.
- Complete repository gate: 171 passed, 0 failed, skipped, or canceled.
- Fresh database: all 10 additive migrations passed.
- Sequential upgrade database: all 10 additive migrations passed.
- Workspace typecheck, lint, schema, architecture, docs, and production builds
  passed.
- Graphify: 3,340 nodes, 6,151 edges, and 304 communities.
- Outcome classes: 10.
- Primary response file kinds: 7.
- Registered worker job types remain 14, including response assembly.
- Implementation commit:
  `79c7c595e956a97cf5d41456d63972342a8e5b28`.

## Staging Gates

- Verify live private upload, download, expiry, and cleanup with approved
  object-storage credentials.
- Verify the selected malware scanning provider on returned PDFs and
  attachments.
- Install and benchmark qpdf for response packages above the moderate-memory
  threshold.
- Exercise project-specific client procedures and reference samples with
  Document Control owners.
- Confirm worker authorization and provider observability in staging.

## Phase 12 Readiness

Ready. Phase 12 can consume immutable Package Hash, response outcome, revision,
approval-evidence, and verification-policy records. The public verification
surface must remain allowlist-based and must not expose response files,
reviewer names, internal comments, storage identities, or workflow internals.
