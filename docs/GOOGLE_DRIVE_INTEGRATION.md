# Google Drive Integration

Date: 2026-07-29

New controlled files use Google Drive File ID as external authority. Display
names, paths, and parent folders are informational snapshots and may change
without breaking identity.

The official adapter supports metadata, stream and byte-range reads,
server-to-server copy, folder creation, Shared Drives, permission listing and
removal, restricted grants, moves, resumable uploads, and authorized temporary
deletion. It never creates a public share link.

Google Picker uses a short-lived, one-time server handoff. The browser submits
only the selected File ID; the server re-reads MIME, size, Drive location,
owners, trash state, and access. Ordinary responses return only internal file
and job IDs.

Live verification is `BLOCKED_EXTERNAL_CREDENTIALS`. Tests use a deterministic
fake adapter and never call Google.
