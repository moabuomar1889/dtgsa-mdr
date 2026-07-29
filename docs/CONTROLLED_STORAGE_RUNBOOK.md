# Controlled Storage Runbook

Date: 2026-07-29

## Setup

1. Provision a dedicated Shared Drive or restricted service-owned root.
2. Configure root and Shared Drive IDs as server secrets.
3. Grant only service, DC admin, system admin, and emergency admin access.
4. Run Picker and copy tests in a dedicated staging folder.
5. Run permission reconciliation before enabling controlled submissions.

## Incident Response

For missing, trashed, hash, size, or permission findings, block delivery,
preserve evidence, notify security/DC owners, inspect Drive audit history, and
record an explicit resolution. Never overwrite the database checksum or
replace a verified file to make an alert disappear.

## Recovery

Retry failed copy jobs through their existing job ID. The worker returns an
already verified record without copying again. Temporary upload deletion is
allowed only after completion or explicit authorized cancellation.
