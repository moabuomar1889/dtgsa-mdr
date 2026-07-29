ALTER TABLE "WorkflowDefinitionVersion"
  ADD COLUMN "policyDigest" TEXT,
  ADD COLUMN "supersededAt" TIMESTAMP(3);

ALTER TABLE "WorkflowDefinitionStep"
  ADD COLUMN "label" TEXT,
  ADD COLUMN "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "commentRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "dcValidation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowAssigneePool" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "fallbackAssignment" JSONB,
  ADD COLUMN "escalationPolicy" JSONB,
  ADD COLUMN "returnTargets" JSONB,
  ADD COLUMN "rejectionBehavior" TEXT;

ALTER TABLE "WorkflowSnapshot"
  ADD COLUMN "packageHash" TEXT;

ALTER TABLE "WorkflowSnapshotStep"
  ADD COLUMN "parallelGroupId" TEXT,
  ADD COLUMN "policySnapshot" JSONB;

ALTER TABLE "ApprovalCycle"
  ADD COLUMN "invalidatedAt" TIMESTAMP(3),
  ADD COLUMN "invalidationReason" TEXT;

ALTER TABLE "WorkflowStepInstance"
  ADD COLUMN "stepOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "parallelGroupId" TEXT,
  ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "quorum" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "policySnapshot" JSONB;

ALTER TABLE "ApprovalDecision"
  ADD COLUMN "approvalEvidenceId" TEXT,
  ADD COLUMN "resultHash" TEXT;

CREATE UNIQUE INDEX "ApprovalDecision_approvalEvidenceId_key"
  ON "ApprovalDecision"("approvalEvidenceId");

ALTER TABLE "ReviewSession"
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "packageHash" TEXT,
  ADD COLUMN "declarationAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "downloadedAt" TIMESTAMP(3),
  ADD COLUMN "revokedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ReviewSession_step_user_package_key"
  ON "ReviewSession"("stepInstanceId", "userId", "packageHash");

CREATE OR REPLACE FUNCTION "prevent_published_version_mutation"()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'Published' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Published version records are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "prevent_workflow_version_mutation"()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" IN ('Published', 'Superseded') THEN
    RAISE EXCEPTION 'Published version records are immutable';
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD."status" = 'Published'
     AND NEW."status" = 'Superseded'
     AND NEW."definitionId" = OLD."definitionId"
     AND NEW."version" = OLD."version"
     AND NEW."publishedAt" IS NOT DISTINCT FROM OLD."publishedAt"
     AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt"
     AND NEW."policyDigest" IS NOT DISTINCT FROM OLD."policyDigest"
     AND NEW."supersededAt" IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF OLD."status" IN ('Published', 'Superseded') AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Published version records are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER "WorkflowDefinitionVersion_published_immutable"
  ON "WorkflowDefinitionVersion";

CREATE TRIGGER "WorkflowDefinitionVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "WorkflowDefinitionVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_workflow_version_mutation"();

CREATE OR REPLACE FUNCTION "prevent_published_workflow_content_mutation"()
RETURNS trigger AS $$
DECLARE
  parent_version_id text;
  parent_status "FoundationRecordStatus";
BEGIN
  parent_version_id := COALESCE(NEW."versionId", OLD."versionId");
  SELECT "status" INTO parent_status
  FROM "WorkflowDefinitionVersion"
  WHERE "id" = parent_version_id;
  IF parent_status IN ('Published', 'Superseded') THEN
    RAISE EXCEPTION 'Published workflow content is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_workflow_snapshot_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Workflow snapshots and snapshot steps are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WorkflowSnapshot_immutable"
BEFORE UPDATE OR DELETE ON "WorkflowSnapshot"
FOR EACH ROW EXECUTE FUNCTION reject_workflow_snapshot_mutation();

CREATE TRIGGER "WorkflowSnapshotStep_immutable"
BEFORE UPDATE OR DELETE ON "WorkflowSnapshotStep"
FOR EACH ROW EXECUTE FUNCTION reject_workflow_snapshot_mutation();

CREATE OR REPLACE FUNCTION reject_approval_decision_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD."approvalEvidenceId" IS NULL
     AND NEW."approvalEvidenceId" IS NOT NULL
     AND NEW."id" = OLD."id"
     AND NEW."stepInstanceId" = OLD."stepInstanceId"
     AND NEW."actorUserId" = OLD."actorUserId"
     AND NEW."decision" = OLD."decision"
     AND NEW."expectedStateVersion" = OLD."expectedStateVersion"
     AND NEW."idempotencyKey" = OLD."idempotencyKey"
     AND NEW."comments" IS NOT DISTINCT FROM OLD."comments"
     AND NEW."decidedAt" = OLD."decidedAt"
     AND NEW."resultHash" IS NOT DISTINCT FROM OLD."resultHash" THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Approval decisions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ApprovalDecision_immutable"
BEFORE UPDATE OR DELETE ON "ApprovalDecision"
FOR EACH ROW EXECUTE FUNCTION reject_approval_decision_mutation();

ALTER TABLE "WorkflowDefinitionStep"
  ADD CONSTRAINT "WorkflowDefinitionStep_positive_quorum"
  CHECK ("quorum" > 0);

ALTER TABLE "WorkflowStepInstance"
  ADD CONSTRAINT "WorkflowStepInstance_positive_quorum"
  CHECK ("quorum" > 0);
