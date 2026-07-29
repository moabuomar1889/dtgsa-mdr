# Google Drive Integration

Date: 2026-07-30

Production file authority uses `GOOGLE_DRIVE_CONTROLLED` and
`GOOGLE_DRIVE_SOURCE`. Google Drive File ID is the immutable external identity;
names, paths, and parent folders are descriptive snapshots.

The adapter supports metadata, streaming and range reads, server-side copy,
folder creation, Shared Drives, restricted permissions, moves, resumable
uploads, and authorized temporary deletion. It never creates a public share
link. Application routes enforce authorization and do not expose raw Drive
credentials or IDs.

Google Picker uses a short-lived one-time handoff. The browser submits the
selected ID and the server re-reads MIME type, size, Drive location, ownership,
trash state, and access before accepting it.

Local acceptance uses filesystem adapters under `.local-runtime`; it does not
fall back to or contact Drive. Live Drive verification remains
`BLOCKED_EXTERNAL_CREDENTIALS`.
