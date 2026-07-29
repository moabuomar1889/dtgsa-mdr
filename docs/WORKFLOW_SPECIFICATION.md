# Workflow Specification

Workflow definitions are reusable records with draft, published, superseded,
and archived versions. Editing always creates a new draft version. Published
and superseded content is database-immutable; publishing a replacement only
changes the prior version's lifecycle status.

Each step snapshots key, order, label, assignment strategy/value/fallback,
required/optional status, parallel group, quorum, review and comment
requirements, DC status, return targets, rejection behavior, and escalation
policy. Assignments resolve from a person, project role, department role,
Google group, dynamic key, or explicit fallback. Pools require explicit policy.

Submission verifies a controlled Main File and Package Hash, resolves
assignments, evaluates separation of duties, writes an immutable workflow
snapshot, creates a numbered cycle and step instances, activates the first
sequential or parallel stage, and emits durable outbox events in one
transaction.

The default engineering workflow is:

1. Prepared By Manager.
2. Independent Reviewer.
3. Approver.
4. Additional configured manager steps or groups.
5. Mandatory DC Validator.
6. Internally Approved.

Non-engineering workflows may explicitly disable DC validation.
