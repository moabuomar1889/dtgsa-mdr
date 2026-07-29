# Comment Model

Date: 2026-07-29

Comments belong to a revision and optionally a Package Manifest. They support
general, page, relative rectangle, and selected-text locations. Coordinates
remain between zero and one so annotations survive zoom and screen changes.

Each comment stores body, category, blocking flag, state, due date,
responsible department, author, optional assignments, attachments, replies,
and an append-oriented status timeline. Replies use `parentCommentId`.

The lifecycle is Open to Resolved to Verified to Closed, with Reopened
transitions back to resolution. A responsible person cannot verify or close a
blocking comment, and an author cannot self-verify closure. This keeps
technical correction and independent verification separate.

Approval and DC validation fail while blocking comments remain Open or
Reopened. Return requires a reason, responsible department, at least one
blocking comment, a future due date, and explicit confirmation.
