# Client Response Lifecycle

Date: 2026-07-29

## Policy Authority

Client response behavior comes from a published, immutable response-code
version. A project configuration takes precedence over the latest published
client default. External values may be numbers, letters, or text. The platform
never assigns global meaning to a numeric code.

Document Control creates a client policy draft, optionally starts from a
development fixture, adds, removes, or reorders codes, configures independent
effects, uploads client procedures or samples, validates the complete version,
and publishes it. A later draft clones the current version. Publishing the
later version supersedes the earlier version without changing historical
responses.

## Registration

1. Select an exact `ClientSubmission`.
2. Resolve its published project override or client default.
3. Select a code and preview its configured effects.
4. Record the incoming reference, response date, reviewer evidence, comments,
   one primary response file, and optional attachments.
5. Verify the expected primary file kind and returned-file requirement.
6. Store and hash each file.
7. Snapshot exact wording, label, policy version, effects, and snapshot hash.
8. Mark prior responses for the revision historical and the new response
   current.
9. Update document and revision state only from the effects snapshot.
10. Offer the revision wizard only when the snapshot requires it.

The platform does not forge or recreate a client signature. Any signature
visible in a returned file is untrusted external evidence preserved with that
file.

## History and Status

Multiple responses may refer to one submission or revision. No historical row,
file, wording, or effect is overwritten. The latest active response determines
the displayed external status. Final approval closes a document only when both
`finalApproval` and `closureAllowed` are true. Rejected outcomes cannot count
as approved.

## Downloads

The response label is dynamic:

```text
Client Response - <configured internal label>
```

All assembly is queued through `PDF_ASSEMBLE_CLIENT_RESPONSE`. The worker
selects components from the snapshotted file kind and always uses the exact
Main PDF recorded on the selected client submission. It writes a private,
expiring `GeneratedArtifactRecord`; the controlled Main PDF is not duplicated.
