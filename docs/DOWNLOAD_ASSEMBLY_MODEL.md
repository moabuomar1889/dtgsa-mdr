# Download Assembly Model

Date: 2026-07-29

## Signed Internally

The user requests one artifact for one exact package hash and assembly profile.
Authorization, active controlled Main PDF, verified integrity, current package
manifest, SHA-256 package hash, and generated signed cover are required before
enqueue.

Component order is fixed:

1. Internally signed and sealed cover.
2. Exact controlled Main PDF.
3. Configured controlled attachments in stored order.

The cache key is SHA-256 over package hash plus canonical profile. It is shared
across signers; no signer-specific Main PDF copy is created. The output is a
non-authoritative `GeneratedArtifactRecord` with requester, authorization
scope, package hash, artifact SHA-256, size, bytes processed, engine version,
duration, expiry, and cleanup state.

## Engines

`pdf-lib@1.17.1` is selected for inputs up to 32 MiB because existing moderate
render and merge tests are deterministic. Inputs above that threshold select
`qpdf` in a bounded subprocess. Arguments are passed without a shell; worker
deployment must apply CPU, memory, wall-time, filesystem, and no-network
limits. If `qpdf` is unavailable, large assembly fails closed rather than
falling back to an unbounded in-memory copy.

The local 100 MiB policy test selects `qpdf`; the current workstation reports
`QPDF_NOT_INSTALLED`, so no false end-to-end 100 MiB success is claimed.
Production/staging images must install and license-inventory qpdf before
enabling large assembly. qpdf is Apache-2.0; `pdf-lib` is MIT.

## Integrity

Every source is loaded by internal file-object ID and verified against its
stored SHA-256. Missing, corrupt, unauthorized, or tampered input blocks output.
The resulting bytes are hashed before persistence. Temporary files are never
manifest items and never become authoritative.
