# Outbox Model

Date: 2026-07-29

Business state, `OutboxEvent`, and the first `BackgroundJob` are written in one
PostgreSQL transaction. The event identifies type, aggregate, aggregate ID,
correlation ID, payload, availability, attempt state, lease, last error, and
dead-letter time.

Consumers create jobs with a deterministic key derived from event ID, channel,
and destination. `DeliveryAttempt.idempotencyKey` is unique, so an email or
external delivery cannot be acknowledged twice after a worker retry. Provider
message IDs and response metadata are stored only after success.

Webhook payloads are signed with versioned HMAC SHA-256 over version,
timestamp, and exact body bytes. Endpoint records keep secret hashes and
rotation metadata; plaintext secrets are not logged. Retryable HTTP/provider
errors back off; permanent errors or exhausted attempts dead-letter while the
delivery history remains queryable.

An event is processed only after all policy-required jobs are durably created.
Marking an event processed never means that external delivery succeeded; the
terminal delivery attempt is the authority for that fact.
