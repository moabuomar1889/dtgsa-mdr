-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IntegrityStatus" ADD VALUE 'TamperDetected';
ALTER TYPE "IntegrityStatus" ADD VALUE 'PermissionDrift';
ALTER TYPE "IntegrityStatus" ADD VALUE 'Trashed';

-- AlterTable
ALTER TABLE "DriveFileIdentity" ADD COLUMN     "lastReconciledAt" TIMESTAMP(3),
ADD COLUMN     "metadataSnapshot" JSONB,
ADD COLUMN     "permissionsHash" TEXT,
ADD COLUMN     "trashed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ControlledMainFile" ADD COLUMN     "approvalLockedAt" TIMESTAMP(3),
ADD COLUMN     "copyJobId" TEXT,
ADD COLUMN     "opaqueFileName" TEXT,
ADD COLUMN     "sourceDriveId" TEXT,
ADD COLUMN     "sourceFileId" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StorageFolderRule" ADD COLUMN     "changedByUserId" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "routeTemplate" JSONB;

-- AlterTable
ALTER TABLE "UploadSession" ADD COLUMN     "expectedHash" TEXT,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "fileObjectId" TEXT,
ADD COLUMN     "idempotencyKey" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "receivedBytes" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "uploadKey" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "UploadSessionPart" (
    "id" TEXT NOT NULL,
    "uploadSessionId" TEXT NOT NULL,
    "partNumber" INTEGER NOT NULL,
    "offsetBytes" BIGINT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadSessionPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickerSelectionHandoff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "selectedFileIdHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "PickerSelectionHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlledStorageIssue" (
    "id" TEXT NOT NULL,
    "reconciliationRunId" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "details" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ControlledStorageIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadSessionPart_uploadSessionId_partNumber_key" ON "UploadSessionPart"("uploadSessionId", "partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UploadSessionPart_uploadSessionId_offsetBytes_key" ON "UploadSessionPart"("uploadSessionId", "offsetBytes");

-- CreateIndex
CREATE UNIQUE INDEX "PickerSelectionHandoff_nonceHash_key" ON "PickerSelectionHandoff"("nonceHash");

-- CreateIndex
CREATE INDEX "PickerSelectionHandoff_userId_projectId_expiresAt_idx" ON "PickerSelectionHandoff"("userId", "projectId", "expiresAt");

-- CreateIndex
CREATE INDEX "ControlledStorageIssue_fileObjectId_resolvedAt_idx" ON "ControlledStorageIssue"("fileObjectId", "resolvedAt");

-- CreateIndex
CREATE INDEX "ControlledStorageIssue_issueType_detectedAt_idx" ON "ControlledStorageIssue"("issueType", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ControlledMainFile_copyJobId_key" ON "ControlledMainFile"("copyJobId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadSession_uploadKey_key" ON "UploadSession"("uploadKey");

-- CreateIndex
CREATE UNIQUE INDEX "UploadSession_idempotencyKey_key" ON "UploadSession"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "DriveFileIdentity" ADD CONSTRAINT "DriveFileIdentity_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileIntegrityCheck" ADD CONSTRAINT "FileIntegrityCheck_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadSessionPart" ADD CONSTRAINT "UploadSessionPart_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledStorageIssue" ADD CONSTRAINT "ControlledStorageIssue_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "ReconciliationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledStorageIssue" ADD CONSTRAINT "ControlledStorageIssue_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UploadSession"
ADD CONSTRAINT "UploadSession_valid_window"
CHECK ("expiresAt" > "createdAt" AND "receivedBytes" >= 0);

ALTER TABLE "UploadSessionPart"
ADD CONSTRAINT "UploadSessionPart_valid_part"
CHECK ("partNumber" >= 0 AND "offsetBytes" >= 0 AND "sizeBytes" > 0);

CREATE OR REPLACE FUNCTION "prevent_verified_controlled_file_mutation"()
RETURNS trigger AS $$
BEGIN
  IF OLD."integrityStatus" = 'Verified'
    AND (
      NEW."fileObjectId" IS DISTINCT FROM OLD."fileObjectId"
      OR NEW."revisionId" IS DISTINCT FROM OLD."revisionId"
      OR NEW."sourceFileId" IS DISTINCT FROM OLD."sourceFileId"
      OR NEW."sourceDriveId" IS DISTINCT FROM OLD."sourceDriveId"
    ) THEN
    RAISE EXCEPTION 'Verified controlled file identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ControlledMainFile_verified_identity_immutable"
BEFORE UPDATE ON "ControlledMainFile"
FOR EACH ROW EXECUTE FUNCTION "prevent_verified_controlled_file_mutation"();
