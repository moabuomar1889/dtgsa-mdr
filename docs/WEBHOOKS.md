# Webhooks

## Events

Supported events are `CASE_STARTED`, `STEP_ACTIVE`, `STEP_COMPLETED`,
`CASE_RETURNED`, `CASE_REJECTED`, `INTERNAL_APPROVAL_COMPLETED`,
`CLIENT_SUBMISSION_REGISTERED`, `CLIENT_RESPONSE_REGISTERED`,
`CLIENT_FINAL_APPROVED`, `FILE_READY`, and `TAMPER_DETECTED`.

## Delivery contract

Deliveries use public HTTPS endpoints only. Loopback, link-local, private IPv4,
`.local`, and non-TLS destinations are rejected to reduce SSRF risk.

Headers:

- `dtg-webhook-id`: immutable outbox event ID and receiver idempotency key.
- `dtg-webhook-timestamp`: UTC ISO timestamp.
- `dtg-webhook-signature`: `v1=<hex hmac sha256>`.
- `idempotency-key`: same immutable event ID.

The signed bytes are `1.<timestamp>.<raw-json-body>`. Receivers must compare the
HMAC in constant time, reject timestamps older than five minutes, and persist
the event ID before applying side effects.

## Secrets and rotation

A random signing secret is returned once. The database stores a one-way hash
for administration and AES-256-GCM ciphertext for delivery, protected by the
deployment-owned `WEBHOOK_ENCRYPTION_KEY`. Rotation retains only bounded
metadata about the previous secret and increments the key version.

## Durability

Business transactions append outbox events. Delivery jobs persist endpoint,
outbox event, attempt count, next attempt, response code, bounded response
metadata, last error, completion, and dead-letter time. Backoff starts at 15
seconds, doubles, caps at one hour, and dead-letters after eight attempts.

Operators may replay a dead letter only after confirming the endpoint and
receiver idempotency behavior. Test endpoints use the same signature path and
must never receive production payloads.
