# Integration Guide

## Provisioning

An administrator creates a service client with the minimum scopes and explicit
project/client restrictions. The client secret is returned once, while only its
SHA-256 hash remains in the database. Rotation creates a new secret and
invalidates the old value. Revocation disables the client immediately.

Store the credential in the source application's server-side secret store. Use
`@dtg/integration-sdk` only from a backend, worker, or protected server action.

## Recommended flow

1. The source system creates an approval case or general request with its
   source system, entity type, record ID, callback, metadata snapshot, purpose,
   and classification.
2. The API returns the central ID and the source application presents a deep
   link to `approve-web`.
3. The source application reads a safe status through the SDK. It does not
   reproduce signature or approval logic.
4. The platform emits signed webhook events as the case changes.
5. The receiver deduplicates by webhook event ID and verifies the signature and
   timestamp before updating its own read model.

## Security boundaries

Service clients never act as employees. Integration-authored comments record
the integration client separately. Human approval, recent authentication,
review evidence, role evidence, and signature evidence remain inside the
central approval application.

Do not transmit Google Drive IDs, provider paths, user session values, raw
verification codes, or approval evidence through source-system metadata.

## SDK

The typed SDK supports create case, read status, submit, comment, download
metadata, verify, general requests, client responses, status badges, and
webhook verification. HTTP failures throw `DtgApiError` with status, code, and
correlation ID.
