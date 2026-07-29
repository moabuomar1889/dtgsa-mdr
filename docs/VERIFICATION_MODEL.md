# Verification Model

Date: 2026-07-29

## Supported Evidence

The verification engine distinguishes `CONTROLLED_MAIN`, `PACKAGE_MANIFEST`,
`INTERNAL_APPROVAL`, `PLATFORM_SEAL`, `CLIENT_RESPONSE_FILE`, and
`GENERATED_ARTIFACT`. Generated artifacts are verifiable derivatives and never
authoritative Main files. A cached artifact may expire while its stored
SHA-256 remains verifiable.

## Code and QR

Codes contain at least 128 bits of cryptographic randomness and are encoded as
URL-safe text. Only SHA-256 code hashes are stored. A code record binds one
manifest, target type, optional target identifier, public label, expiry,
revocation status, and seal transaction. Issuance returns the QR URL once; the
raw code is not recoverable from the database.

Signed-cover data includes the QR URL, document number, revision, package
reference, and seal transaction identifier. Revocation changes lookup status
without deleting historical evidence.

## Verification Process

Verification resolves the code hash, checks expiry and revocation, loads the
exact target, recalculates or compares SHA-256, checks manifest bytes and
Package Hash, resolves the signing key, verifies the application seal
signature, records key status and payload version, and writes a
`VerificationRecord` plus a privacy-safe `VerificationAttempt`.

Retired public keys remain usable for historical verification. Revoked keys
return `REVOKED_KEY`; missing keys return `UNKNOWN_KEY`.

Structured statuses are `VALID`, `INVALID_HASH`, `INVALID_MANIFEST`,
`INVALID_SEAL`, `UNKNOWN_KEY`, `REVOKED_KEY`, `MISSING_FILE`,
`TAMPER_DETECTED`, `UNSUPPORTED_VERSION`, and `LEGACY_UNVERIFIABLE`.

## Local Files

The browser reads the selected file and calculates SHA-256 with Web Crypto. It
submits only the hash. Progress and cancellation are visible. The default flow
does not upload or retain file bytes.

## Trust Claim

The platform verifies its application seal and evidence graph. It does not
claim PAdES. Legacy visible signature events are classified as
`LEGACY_UNVERIFIABLE`.
