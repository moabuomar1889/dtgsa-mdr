# Package Manifest Specification

Version `1` uses canonicalization `RFC8785-DTG-1` and SHA-256. Object keys are
lexically ordered, finite numbers only, negative zero normalizes to zero, and
attachments sort by kind plus internal file ID. Duplicate attachment keys,
unsupported versions, and invalid hashes are rejected.

The manifest snapshots organization, client, project, document identity and
revision, controlled Main File identity/hash/type/size/pages, attachments,
metadata, classification, cover version/hash, workflow snapshot/digest,
creation time, and creating system version. Canonical bytes and immutable
package versions preserve historical verification.
