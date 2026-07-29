ALTER TABLE "AuditLog"
  ADD COLUMN "auditStream" TEXT,
  ADD COLUMN "auditSequence" BIGINT;

CREATE UNIQUE INDEX "AuditLog_auditStream_auditSequence_key"
  ON "AuditLog"("auditStream", "auditSequence");

CREATE TABLE "AuditCheckpoint" (
  "id" TEXT NOT NULL,
  "auditStream" TEXT NOT NULL,
  "sequence" BIGINT NOT NULL,
  "currentHash" TEXT NOT NULL,
  "eventCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditCheckpoint_auditStream_sequence_key"
  ON "AuditCheckpoint"("auditStream", "sequence");

ALTER TABLE "GeneratedArtifactRecord"
  ADD COLUMN "sourceManifestId" TEXT,
  ADD COLUMN "assemblyProfile" JSONB,
  ADD COLUMN "pdfEngineVersion" TEXT,
  ADD COLUMN "artifactSha256" TEXT,
  ADD COLUMN "sizeBytes" BIGINT,
  ADD COLUMN "requesterUserId" TEXT,
  ADD COLUMN "cleanupStatus" TEXT NOT NULL DEFAULT 'Pending',
  ADD COLUMN "cleanedAt" TIMESTAMP(3);

ALTER TABLE "PackageManifest"
  ADD COLUMN "canonicalBytes" BYTEA,
  ADD COLUMN "manifestDigest" TEXT,
  ADD COLUMN "packageVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "invalidatedAt" TIMESTAMP(3);

ALTER TABLE "ApprovalEvidence"
  ADD COLUMN "evidenceVersion" TEXT NOT NULL DEFAULT '1',
  ADD COLUMN "canonicalPayload" BYTEA,
  ADD COLUMN "googleSubjectId" TEXT,
  ADD COLUMN "employeeSnapshot" JSONB,
  ADD COLUMN "workflowSnapshot" JSONB,
  ADD COLUMN "approvalCycleId" TEXT,
  ADD COLUMN "decision" TEXT,
  ADD COLUMN "declarationHash" TEXT,
  ADD COLUMN "recentAuthEvidenceId" TEXT,
  ADD COLUMN "requestMetadata" JSONB,
  ADD COLUMN "signatureAppearanceVersionId" TEXT;

ALTER TABLE "PlatformSeal"
  ADD COLUMN "publicKeyReference" TEXT,
  ADD COLUMN "signedPayloadVersion" TEXT NOT NULL DEFAULT '1',
  ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'Pending';

ALTER TABLE "TimestampEvidence"
  ADD COLUMN "timestampType" TEXT NOT NULL DEFAULT 'PLATFORM_UTC',
  ADD COLUMN "authenticatedDatabaseTime" TIMESTAMP(3);

CREATE OR REPLACE FUNCTION reject_phase6_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Phase 6 trust evidence is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PackageManifest_immutable"
BEFORE UPDATE OR DELETE ON "PackageManifest"
FOR EACH ROW EXECUTE FUNCTION reject_phase6_evidence_mutation();

CREATE TRIGGER "ApprovalEvidence_immutable"
BEFORE UPDATE OR DELETE ON "ApprovalEvidence"
FOR EACH ROW EXECUTE FUNCTION reject_phase6_evidence_mutation();

CREATE TRIGGER "PlatformSeal_immutable"
BEFORE UPDATE OR DELETE ON "PlatformSeal"
FOR EACH ROW EXECUTE FUNCTION reject_phase6_evidence_mutation();

CREATE TRIGGER "TimestampEvidence_immutable"
BEFORE UPDATE OR DELETE ON "TimestampEvidence"
FOR EACH ROW EXECUTE FUNCTION reject_phase6_evidence_mutation();

CREATE OR REPLACE FUNCTION reject_hashed_audit_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."currentAuditHash" IS NOT NULL THEN
    RAISE EXCEPTION 'Hashed audit events are append-only';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_hashed_append_only"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION reject_hashed_audit_mutation();
