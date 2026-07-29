# Legacy Storage Migration

Date: 2026-07-29

Status: `HISTORICAL_ONLY`

This document records a migration plan superseded before operational use. No
compatibility reader or fallback remains. Current providers are defined in
`docs/FILE_STORAGE_PROVIDERS.md`.

Existing Supabase files remain readable through the compatibility service and
are classified as legacy. New target controlled workflows use `FileObject`
with Google Drive authority and cannot treat a Supabase path as the
authoritative Main File.

The inventory operation is dry-run only and reports legacy record counts. It
does not copy or delete data. There is no silent migration and no automatic
deletion. External operational data must be inventoried and owner-approved
before any future migration or retirement plan.
