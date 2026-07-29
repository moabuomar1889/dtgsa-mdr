# Approval Help

Date: 2026-07-29

## Roles

Prepared By Manager confirms the prepared package. Reviewer performs
independent technical review. Approver accepts approval responsibility. DC
Validator checks document-control readiness and may validate or return.

## Review Requirement

A signature decision is available only after the assigned user opens the exact
controlled Package Hash, renders controlled content, accepts the declaration,
and has valid recent authentication.

## Signature and Verification

The visible employee signature is appearance context. The trust record is
immutable ApprovalEvidence bound to identity, role, workflow snapshot, review
session, Package Hash, decision, recent authentication, and signature
appearance version. The platform does not claim PAdES in this phase.

## Problems

For loading errors, retry after checking connectivity. For offline or stale
content, do not decide; reopen the package and confirm its Package Hash. For an
integrity-blocked file, contact Document Control. Rejection and return require
clear comments; return additionally requires a responsible department,
blocking comments, due date, and confirmation.

## Client Responses

Document Control manages client response meanings at
`/settings/response-codes`. Published policies are immutable; create a new
draft version for changes. Register returned evidence at `/replies`, preview
the configured effects, and use the guided revision action only when offered.
The dynamic download label comes from the policy and may include the exact
submitted Main PDF.

## Verification

Use the public verification portal to enter a code or scan a cover QR. A local
file is hashed in the browser and is not uploaded. Employees may use
`/verification` for scoped internal evidence. A red result means the selected
hash or evidence chain did not verify; do not treat a visible signature image
as proof. The platform seal is not a PAdES claim.
