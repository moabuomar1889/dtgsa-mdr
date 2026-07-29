ALTER TYPE "JobState" ADD VALUE IF NOT EXISTS 'Canceled';

ALTER TABLE "OutboxEvent"
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastError" JSONB,
  ADD COLUMN "deadLetteredAt" TIMESTAMP(3);

ALTER TABLE "BackgroundJob"
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "heartbeatAt" TIMESTAMP(3),
  ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "progressMessage" TEXT,
  ADD COLUMN "cancelRequestedAt" TIMESTAMP(3),
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "deadLetteredAt" TIMESTAMP(3),
  ADD COLUMN "lastError" JSONB,
  ADD COLUMN "metrics" JSONB;

UPDATE "BackgroundJob"
SET "idempotencyKey" = 'legacy:' || "id"
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "BackgroundJob"
  ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "BackgroundJob_idempotencyKey_key"
  ON "BackgroundJob"("idempotencyKey");

ALTER TABLE "JobAttempt"
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "heartbeatAt" TIMESTAMP(3),
  ADD COLUMN "durationMs" INTEGER,
  ADD COLUMN "retryAt" TIMESTAMP(3);

CREATE TABLE "JobArtifact" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "artifactId" TEXT NOT NULL,
  "artifactKind" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobArtifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobArtifact_jobId_artifactId_key"
  ON "JobArtifact"("jobId", "artifactId");
CREATE INDEX "JobArtifact_jobId_createdAt_idx"
  ON "JobArtifact"("jobId", "createdAt");

ALTER TABLE "DeliveryAttempt"
  ADD COLUMN "providerMessageId" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "GeneratedArtifactRecord"
  ADD COLUMN "packageHash" TEXT,
  ADD COLUMN "cacheKey" TEXT,
  ADD COLUMN "authorizationScope" JSONB,
  ADD COLUMN "bytesProcessed" BIGINT,
  ADD COLUMN "assemblyDurationMs" INTEGER;

CREATE UNIQUE INDEX "GeneratedArtifactRecord_cacheKey_key"
  ON "GeneratedArtifactRecord"("cacheKey");
CREATE INDEX "GeneratedArtifactRecord_revisionId_artifactKind_expiresAt_idx"
  ON "GeneratedArtifactRecord"("revisionId", "artifactKind", "expiresAt");
CREATE INDEX "GeneratedArtifactRecord_cleanupStatus_expiresAt_idx"
  ON "GeneratedArtifactRecord"("cleanupStatus", "expiresAt");

ALTER TABLE "WebhookDelivery"
  ADD COLUMN "responseMetadata" JSONB,
  ADD COLUMN "signatureVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastError" JSONB,
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "deadLetteredAt" TIMESTAMP(3);

CREATE INDEX "BackgroundJob_leaseExpiresAt_idx"
  ON "BackgroundJob"("leaseExpiresAt");
CREATE INDEX "BackgroundJob_state_deadLetteredAt_idx"
  ON "BackgroundJob"("state", "deadLetteredAt");
CREATE INDEX "OutboxEvent_leaseExpiresAt_idx"
  ON "OutboxEvent"("leaseExpiresAt");
