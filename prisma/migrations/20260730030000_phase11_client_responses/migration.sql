CREATE TYPE "ClientResponseOutcomeClass" AS ENUM (
  'REJECTED',
  'REJECTED_WITH_COMMENTS',
  'CONDITIONALLY_APPROVED',
  'APPROVED_WITH_COMMENTS',
  'REVISION_REQUIRED',
  'FINAL_APPROVED',
  'INFORMATION_ONLY',
  'HOLD',
  'CANCELLED',
  'CUSTOM'
);

CREATE TYPE "ClientResponseFileKind" AS ENUM (
  'FULL_DOCUMENT',
  'COVER_ONLY',
  'COMMENT_SHEET',
  'APPROVAL_LETTER',
  'RESPONSE_FORM',
  'TRANSMITTAL',
  'OTHER'
);

ALTER TABLE "DocumentRevision"
  ADD COLUMN "sourceClientResponseId" TEXT;

ALTER TABLE "ClientResponseFile"
  ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "attachmentKind" TEXT,
  ADD COLUMN "originalFileName" TEXT;

CREATE UNIQUE INDEX "ClientResponseFile_one_primary_per_response"
  ON "ClientResponseFile"("clientResponseId")
  WHERE "isPrimary" = true;

ALTER TABLE "ClientResponseCodeSet"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "createdByUserId" TEXT;

ALTER TABLE "ClientResponseCodeSetVersion"
  ADD COLUMN "validatedAt" TIMESTAMP(3),
  ADD COLUMN "publishedByUserId" TEXT,
  ADD COLUMN "supersededAt" TIMESTAMP(3),
  ADD COLUMN "validationResult" JSONB,
  ADD COLUMN "snapshotHash" TEXT;

CREATE UNIQUE INDEX "ClientResponseCodeSetVersion_snapshotHash_key"
  ON "ClientResponseCodeSetVersion"("snapshotHash");

CREATE TABLE "ClientResponseCodeReference" (
  "id" TEXT NOT NULL,
  "codeSetId" TEXT NOT NULL,
  "fileObjectId" TEXT NOT NULL,
  "referenceKind" TEXT NOT NULL,
  "description" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientResponseCodeReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientResponseCodeReference_codeSetId_fileObjectId_key"
  ON "ClientResponseCodeReference"("codeSetId", "fileObjectId");

ALTER TABLE "ProjectResponseCodeConfiguration"
  ADD COLUMN "configuredByUserId" TEXT;

ALTER TABLE "ClientResponse"
  ADD COLUMN "submissionId" TEXT,
  ADD COLUMN "externalCodeSnapshot" TEXT,
  ADD COLUMN "labelSnapshot" TEXT,
  ADD COLUMN "outcomeClass" "ClientResponseOutcomeClass" NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN "effectsSnapshot" JSONB,
  ADD COLUMN "incomingReference" TEXT,
  ADD COLUMN "clientReviewerName" TEXT,
  ADD COLUMN "clientReviewerDate" TIMESTAMP(3),
  ADD COLUMN "primaryFileKind" "ClientResponseFileKind",
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supersededAt" TIMESTAMP(3),
  ADD COLUMN "triggeredRevisionId" TEXT;

CREATE INDEX "ClientResponse_submissionId_receivedAt_idx"
  ON "ClientResponse"("submissionId", "receivedAt");
CREATE INDEX "ClientResponse_outcomeClass_receivedAt_idx"
  ON "ClientResponse"("outcomeClass", "receivedAt");

ALTER TABLE "ClientSubmission"
  ADD COLUMN "submittedMainFileObjectId" TEXT,
  ADD COLUMN "packageHash" TEXT;

CREATE OR REPLACE FUNCTION prevent_published_response_version_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'Published' THEN
    IF TG_OP = 'UPDATE'
       AND NEW."status" = 'Superseded'
       AND NEW."codeSetId" = OLD."codeSetId"
       AND NEW."version" = OLD."version"
       AND NEW."publishedAt" IS NOT DISTINCT FROM OLD."publishedAt"
       AND NEW."effectiveFrom" IS NOT DISTINCT FROM OLD."effectiveFrom"
       AND NEW."effectiveTo" IS NOT DISTINCT FROM OLD."effectiveTo"
       AND NEW."validatedAt" IS NOT DISTINCT FROM OLD."validatedAt"
       AND NEW."publishedByUserId" IS NOT DISTINCT FROM OLD."publishedByUserId"
       AND NEW."validationResult" IS NOT DISTINCT FROM OLD."validationResult"
       AND NEW."snapshotHash" IS NOT DISTINCT FROM OLD."snapshotHash" THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Published response-code versions are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "ClientResponseCodeSetVersion_published_immutable"
  ON "ClientResponseCodeSetVersion";
CREATE TRIGGER "ClientResponseCodeSetVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "ClientResponseCodeSetVersion"
FOR EACH ROW EXECUTE FUNCTION prevent_published_response_version_mutation();
