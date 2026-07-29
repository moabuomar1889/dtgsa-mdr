# Workflow Migration

The compatibility mapping is:

- `Prepared` to `prepared`.
- `Reviewed` to `reviewed`.
- `Approved` to `approved`.
- `DcCheck` to `dc-validated`.

New target cases use the configurable engine. Existing fixed workflow rows and
services remain readable and operational while parity is verified. Migration is
feature-flagged and dry-run first; no destructive conversion is authorized.
The legacy path is deprecated only after UI and production-data parity.
