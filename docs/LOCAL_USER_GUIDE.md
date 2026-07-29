# Local User Guide

## Document Control

Select `dc.operator@local.test` for operational work or
`dc.admin@local.test` for configuration. Document Control maintains clients,
projects, PDI, MDR metadata, controlled files, workflow setup, transmittals,
responses, reconciliation, and final DC validation. It does not approve on
behalf of engineering roles.

## Prepared By Manager

Select `prepared.manager@local.test`. Confirm that the package shown is the
intended revision and Package Hash, inspect all pages, then sign the Prepared
By step. A changed package invalidates the review context.

## Reviewer

Select `reviewer@local.test`. Review independently, use page comments, mark
blocking issues, return when correction is required, and verify resolution
before approving. The reviewer must not be the preparer unless a separately
approved emergency override is active.

## Approver

Select `approver@local.test` or `additional.manager@local.test`. Confirm the
review history and current Package Hash, complete recent authentication, make
the formal decision, and do not share sessions.

## DC Validator

Select `dc.validator@local.test`. Confirm completed required decisions, file
integrity, numbering, cover, manifest, and response legend before validating
the package for controlled issue.

## Auditor

Select `auditor@local.test`. Use dashboards, search, reports, verification, and
audit views. Evidence should preserve actor snapshots, relevant hashes,
correlation IDs, and chronological history. Auditor work is read-oriented.

## External Client User

Use only the Magic Link delivered to `client.user@local.test` in the local
email viewer. Client scope is restricted to the invited client, project, and
PDI items. The external session cannot open internal approvals.

## General Request Employee

Choose the applicable request type, complete the versioned form, add synthetic
attachments, submit, and follow status/history. Decisions remain human actions;
the worker may render a summary and deliver events but cannot invent approval.

## Local Simulation Labels

Identity, Drive, email, webhook, signing, and malware scanning are simulated
providers. The signing label is `LOCAL DEVELOPMENT APPLICATION SEAL`. This is
not PAdES, a trusted timestamp, a production certificate, KMS/HSM signing, or a
legally qualified signature.
