# Cryptographic Model

The platform uses SHA-256 canonical package hashes and Ed25519 application
seals. Signature images are appearance only. The package hash binds controlled
file bytes, metadata, classification, cover, workflow, and attachments.

Test and development private keys are forbidden in production. Production must
use a non-exporting KMS/HSM-compatible provider; that provider is not yet
configured. PAdES and trusted third-party timestamps are not implemented.
