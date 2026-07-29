# Controlled Documents Drive

Date: 2026-07-29

`DTG Controlled Documents` is the conceptual restricted storage root. A Shared
Drive is preferred; a dedicated service-owned restricted folder is the
fallback. Google Vault is not used.

Working project folders remain editable. A DC selection reserves exactly one
active `ControlledMainFile`, enqueues `DRIVE_CONTROLLED_COPY`, copies
server-to-server under an opaque name, hashes the bytes with SHA-256, reads PDF
page count, verifies size, restricts permissions, and marks the record
`Verified`.

No per-signer, per-step, or permanent signed-combined copy is created.
Verified identity cannot be changed, and content replacement after an approval
cycle begins is rejected. A content change requires a new controlled version
or revision.

Drive is restricted and tamper-evident, not WORM storage.
