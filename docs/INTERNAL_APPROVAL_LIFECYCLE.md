# Internal Approval Lifecycle

DC registration and controlled-file selection occur before approval and do not
replace Prepared By Manager. Every decision requires an active assigned step,
the expected state version, a completed unexpired review session for the exact
Package Hash and user, unexpired recent authentication, and an accepted
declaration.

Approve, approve with comment, request clarification, return, reject, DC
validate, DC return, cancel, and reassign are explicit commands. Returns require
a reason and responsible department and must use an allowed target.

When protected content changes, the active cycle is invalidated and retained.
Prior decisions and evidence remain historical. A new Package Hash starts a new
cycle from the first step. Before first client submission the external revision
may remain; afterwards a content change requires a new external revision.
