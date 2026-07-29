# Verification Model

Verification returns structured statuses: `VALID`, `INVALID_HASH`,
`INVALID_MANIFEST`, `INVALID_SEAL`, `UNKNOWN_KEY`, `REVOKED_KEY`,
`MISSING_FILE`, `TAMPER_DETECTED`, `UNSUPPORTED_VERSION`, and
`LEGACY_UNVERIFIABLE`.

Verification recalculates canonical bytes and Package Hash, checks Main File
and artifact hashes, resolves key status, verifies the application seal, and
checks evidence references. Generated artifacts are verifiable derivatives,
never authoritative Main Files.
