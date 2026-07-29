ALTER TABLE "ApprovalCycle"
  ADD COLUMN "sourceSystem" TEXT NOT NULL DEFAULT 'DOCUMENT_CONTROL',
  ADD COLUMN "sourceEntityType" TEXT NOT NULL DEFAULT 'DOCUMENT_REVISION',
  ADD COLUMN "sourceRecordId" TEXT,
  ADD COLUMN "sourceCallback" TEXT,
  ADD COLUMN "sourceMetadata" JSONB,
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'Document approval',
  ADD COLUMN "classification" TEXT NOT NULL DEFAULT 'INTERNAL';

ALTER TABLE "Comment"
  ALTER COLUMN "authorUserId" DROP NOT NULL,
  ADD COLUMN "authorIntegrationClientId" TEXT;

ALTER TABLE "IdempotencyRecord"
  ADD COLUMN "statusCode" INTEGER NOT NULL DEFAULT 200;

ALTER TABLE "IntegrationClient"
  ADD COLUMN "projectIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "clientIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN "lastUsedAt" TIMESTAMP(3),
  ADD COLUMN "secretRotatedAt" TIMESTAMP(3),
  ADD COLUMN "credentialMetadata" JSONB;

CREATE TABLE "IntegrationRequestAttempt" (
  "id" TEXT NOT NULL,
  "integrationClientId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "projectId" TEXT,
  "clientId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationRequestAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IntegrationRequestAttempt_client_created_idx"
  ON "IntegrationRequestAttempt"("integrationClientId", "createdAt");
CREATE INDEX "IntegrationRequestAttempt_correlation_idx"
  ON "IntegrationRequestAttempt"("correlationId");

ALTER TABLE "WebhookEndpoint"
  ADD COLUMN "previousSecretHash" TEXT,
  ADD COLUMN "secretRotatedAt" TIMESTAMP(3),
  ADD COLUMN "encryptedSecret" TEXT,
  ADD COLUMN "secretKeyVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "GeneralRequestType" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "departmentOwner" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneralRequestType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GeneralRequestType_code_key"
  ON "GeneralRequestType"("code");

CREATE TABLE "GeneralRequestTypeVersion" (
  "id" TEXT NOT NULL,
  "requestTypeId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Draft',
  "formDefinition" JSONB NOT NULL,
  "workflowTemplateId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneralRequestTypeVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GeneralRequestTypeVersion_type_version_key"
  ON "GeneralRequestTypeVersion"("requestTypeId", "version");

CREATE TABLE "GeneralRequest" (
  "id" TEXT NOT NULL,
  "requestTypeVersionId" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "sourceEntityType" TEXT NOT NULL,
  "sourceRecordId" TEXT NOT NULL,
  "sourceCallback" TEXT,
  "sourceMetadata" JSONB,
  "purpose" TEXT NOT NULL,
  "classification" TEXT NOT NULL,
  "projectId" TEXT,
  "clientId" TEXT,
  "submittedByUserId" TEXT,
  "formData" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Draft',
  "summaryFileObjectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneralRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GeneralRequest_requestNumber_key"
  ON "GeneralRequest"("requestNumber");
CREATE INDEX "GeneralRequest_source_idx"
  ON "GeneralRequest"("sourceSystem", "sourceEntityType", "sourceRecordId");

CREATE TABLE "GeneralRequestAttachment" (
  "id" TEXT NOT NULL,
  "generalRequestId" TEXT NOT NULL,
  "fileObjectId" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneralRequestAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GeneralRequestAttachment_request_fkey"
    FOREIGN KEY ("generalRequestId") REFERENCES "GeneralRequest"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GeneralRequestAttachment_request_file_key"
  ON "GeneralRequestAttachment"("generalRequestId", "fileObjectId");

CREATE OR REPLACE FUNCTION prevent_published_request_version_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'Published' THEN
    RAISE EXCEPTION 'Published general-request versions are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GeneralRequestTypeVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "GeneralRequestTypeVersion"
FOR EACH ROW EXECUTE FUNCTION prevent_published_request_version_mutation();
