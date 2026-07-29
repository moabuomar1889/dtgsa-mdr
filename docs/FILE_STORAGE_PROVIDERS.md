# File Storage Providers

Date: 2026-07-30

Status: `AUTHORITATIVE`

## Supported Providers

| Environment                 | Provider                      |
| --------------------------- | ----------------------------- |
| Production controlled files | `GOOGLE_DRIVE_CONTROLLED`     |
| Production source files     | `GOOGLE_DRIVE_SOURCE`         |
| Local controlled files      | `LOCAL_CONTROLLED_FILESYSTEM` |
| Local source files          | `LOCAL_SOURCE_FILESYSTEM`     |
| Local temporary artifacts   | `LOCAL_TEMPORARY_ARTIFACT`    |

## Provider Contract

Domain services select an area: source, controlled, or temporary. The storage
service resolves the environment-specific adapter and returns a provider plus
an opaque provider key. Upload, stream/range read, download, and authorized
temporary deletion use this common contract. Domain data does not contain
bucket names, public object URLs, or provider-specific paths.

Production Drive identity uses immutable file IDs and version/hash evidence.
Names and folder paths are descriptive snapshots only. Local keys resolve
strictly beneath `.local-runtime`; path traversal and remote hosts are rejected.

## Browser Delivery

Files are delivered through authenticated, authorization-aware application
routes. Provider keys, filesystem paths, and Drive credentials are not exposed
as public links. Public verification returns privacy-allowlisted evidence, not
private file bytes.

## Data Separation

PostgreSQL stores metadata, hashes, manifests, identity, and audit evidence.
Large PDF, signature, attachment, template, and generated-artifact bytes remain
in Drive or the local filesystem.
