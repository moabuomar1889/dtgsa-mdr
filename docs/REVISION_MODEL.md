# Revision Model

Date: 2026-07-29

## Trigger

The guided revision action reads only the active client's snapshotted effects.
It refuses a revision when neither a new revision nor a new document number is
required. Client-submitted content changes must enter a new external revision;
the prior controlled package is never edited in place.

## New Revision

The wizard preserves the base DTG document number and stable document,
project, client, discipline, type, release-purpose, and workflow defaults. It
calculates the next numeric, alphabetic, or suffixed label, stores
`parentRevisionId` and `sourceClientResponseId`, and records unresolved comment
identifiers as lineage evidence.

The selected new working PDF becomes one new controlled Main file with a new
SHA-256. A new manifest and Package Hash bind the revision label, Main file,
hash, and source response. Workflow steps are reseeded at Draft/Prepared By
Manager. The document points to the new current revision; the source revision
becomes superseded and remains locked.

## Evidence Boundaries

Old manifests, package hashes, approvals, response files, and audit evidence
remain attached to the old revision. Approval decisions and signatures are
never copied. The revision action records `signaturesCopied: false` in workflow
and audit evidence.

No generated response package becomes an authoritative Main PDF. Dynamic
downloads are expiring derivatives assembled from immutable references.
