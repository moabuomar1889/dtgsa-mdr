# Transmittal Delivery

Date: 2026-07-29

The user action now creates `TRANSMITTAL_DELIVER` and
`transmittal.delivery_requested` atomically. Repeated clicks return the same
job. The transmittal stays `ReadyToSend`; no PDF, Drive upload, email, workflow
transition, or `Sent` claim occurs in request scope.

The durable processor owns this order:

1. Reload the exact transmittal and ordered revision set.
2. Render the transmittal document.
3. Assemble and hash the exact package.
4. Persist generated-document and delivery-attempt evidence.
5. Deliver through configured Drive and email adapters.
6. Record provider response and recipient/CC hashes.
7. Mark the transmittal and revisions sent only after policy-required delivery
   succeeds.
8. Publish notifications and audit evidence.

The deterministic key is `transmittal:{id}:deliver:v1`. Email delivery uses a
separate unique attempt key so retries cannot send the same message twice after
provider acknowledgement. A provider timeout before acknowledgement remains an
operator-review case; the provider message ID is the reconciliation key.

The old synchronous processor remains an explicit compatibility function for
characterization and rollback. The user-facing action no longer calls it.
