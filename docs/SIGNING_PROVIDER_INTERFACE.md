# Signing Provider Interface

`SigningProvider` signs bytes without requiring private-key export.
`PlatformSealProvider` adds key identity and public-key reference.
`PdfSealProvider` is a deferred boundary and does not imply PAdES support.
`KeyRegistryProvider` resolves active, revoked, and unknown public keys.

The deterministic Ed25519 provider is test-only. The environment-key provider
is development-only. Both throw in production. A real KMS/HSM provider remains
an external production blocker.
