# Phase 12 Verification Portal Report

Date: 2026-07-29

## Verdict

Phase 12 is code-complete and locally verified. Public verification is
privacy-allowlisted and enumeration-resistant; internal verification is
authenticated and project-scoped. Local browser hashing detects modified
bytes without uploading files by default.

## Supported Verification Types

The exact target vocabulary is `CONTROLLED_MAIN`, `PACKAGE_MANIFEST`,
`INTERNAL_APPROVAL`, `PLATFORM_SEAL`, `CLIENT_RESPONSE_FILE`, and
`GENERATED_ARTIFACT`. Verification records survive generated-artifact cache
expiry because hashes are retained.

## Codes, QR, and Privacy

Codes use at least 128 bits of cryptographic randomness. Only SHA-256 code
hashes are stored. Issuance binds document number, revision, package reference,
seal transaction, target type, expiry, revocation state, and a
`verify.dtgapps.cc` QR URL.

Project policies independently allow public document, project/client, approval,
response, completion, and package-match fields. Emails, names of approvers,
comments, Drive/storage IDs, raw request addresses, session data, and sensitive
audit evidence are never serialized publicly. Unknown, revoked, and expired
codes share one generic result.

## Hash, Manifest, Seal, and Keys

The browser computes SHA-256 locally with progress and cancellation. Exact
hash comparison detects a one-byte modification. The server checks manifest
bytes and Package Hash, target hashes, application seal signature, algorithm,
key ID, public key, payload version, and key state. Retired keys remain
verifiable; unknown and revoked keys fail explicitly.

The platform verifies an application seal. PAdES is not implemented or
claimed. Legacy visible signatures remain `LEGACY_UNVERIFIABLE`.

## Rate Limit and Audit

Public requests are limited to twenty attempts per privacy-hashed fingerprint
in ten minutes. Raw IP/session identifiers are not stored. Successful,
tampered, and failed lookups create attempt evidence; resolved targets also
create `VerificationRecord` evidence.

## Verification Metrics

- Phase 12 unit scenarios: 4 passed.
- Complete unit and architecture command: 108 passed.
- Disposable PostgreSQL integration: 17 passed.
- Complete repository gate: 176 passed, 0 failed, skipped, or canceled.
- Fresh database: all 11 additive migrations passed.
- Sequential upgrade database: all 11 additive migrations passed.
- Verify app, MDR app, remaining apps, packages, worker, schema, lint,
  typecheck, and architecture passed.
- Implementation commit:
  `0c20c5748dbc8a52f6d4bb6a620beedca37b1ac5`.

## Graphify

AST extraction completed, but the installed Graphify rebuild failed internally
with `unsupported operand type(s) for -: 'dict_itemiterator' and 'float'`.
Source documentation was updated; a later tool-version retry remains required.
This is an external tooling defect, not a skipped code gate.

## Staging Gates

Deploy and verify the public domain, reverse-proxy fingerprint headers,
distributed edge rate limiting, production signing-key registry, revocation
operations, and observability. Optional temporary file upload is intentionally
not enabled; adding it later requires explicit consent, scanning, isolation,
size limits, and guaranteed deletion.

## Phase 13 Readiness

Ready. Versioned APIs may expose verification operations only through the same
allowlists, generic lookup behavior, scopes, rate limits, and audit contracts.
