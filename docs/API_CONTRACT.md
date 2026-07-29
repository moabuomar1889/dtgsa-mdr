# Integration API Contract

## Version and transport

The integration surface is rooted at `/api/v1`. JSON responses include an
`x-request-id` header and a `correlationId` body field. The generated OpenAPI
document is available at `/api/v1/openapi.json`.

Service clients send `Authorization: Bearer clientKey.clientSecret`. Credentials
are for trusted server workloads only and must never be bundled into browsers.
Mutation requests also send a unique `Idempotency-Key`.

## Resources

| Resource             | Read                       | Mutation               | Scope                             |
| -------------------- | -------------------------- | ---------------------- | --------------------------------- |
| `documents`          | scoped register            | none                   | `documents:read`                  |
| `revisions`          | scoped revisions           | none                   | `documents:read`                  |
| `approval-cases`     | list/status                | create/submit          | `cases:read`, `cases:write`       |
| `approval-steps`     | safe status                | none                   | `cases:read`                      |
| `review-sessions`    | timestamps/status only     | none                   | `cases:read`                      |
| `comments`           | safe timeline              | case comment           | `comments:write`                  |
| `client-submissions` | safe submission metadata   | none                   | `cases:read`                      |
| `client-responses`   | safe response history      | register               | `responses:write`                 |
| `downloads`          | expiring artifact metadata | none                   | `downloads:read`                  |
| `verification`       | service status             | hash/code verification | `verification:read`               |
| `general-requests`   | list/status                | submit                 | `requests:read`, `requests:write` |
| `integrations`       | client administration      | create                 | `integrations:manage`             |
| `webhooks`           | endpoint administration    | subscribe              | `webhooks:manage`                 |

Collection responses are bounded to 100 recent records. Project and client
restrictions are enforced before access. A client with an empty restriction
list is deliberately platform-wide and should be rare.

## Errors

Errors have:

```json
{
  "error": "cross_project_denied",
  "message": "The requested project is outside the service-client boundary.",
  "correlationId": "7e982fa5-cc7d-43f0-988b-9924fd2797d1"
}
```

Expected statuses are `400`, `401`, `403`, `404`, `405`, `409`, `413`, `429`,
`500`, and `503`. Authentication failures do not disclose whether a client key
exists.

## Idempotency

Every POST stores client ID, endpoint scope, key, canonical request hash,
response, status, and 24-hour expiry. A retry with the same payload returns the
original status and response. Reusing the key with another payload returns
`409 idempotency_payload_mismatch`.

## Privacy

API serialization recursively removes credential hashes, encrypted webhook
secrets, Drive IDs, storage paths, identity evidence, request metadata, private
approval evidence, and internal comments. Downloads return artifact metadata,
not raw provider locations.
