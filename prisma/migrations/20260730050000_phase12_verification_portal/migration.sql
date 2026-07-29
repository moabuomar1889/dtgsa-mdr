ALTER TABLE "VerificationCode"
  ADD COLUMN "targetType" TEXT NOT NULL DEFAULT 'PACKAGE_MANIFEST',
  ADD COLUMN "targetId" TEXT,
  ADD COLUMN "publicLabel" TEXT,
  ADD COLUMN "sealTransactionId" TEXT;

CREATE INDEX "VerificationCode_targetType_targetId_idx"
  ON "VerificationCode"("targetType", "targetId");

CREATE TABLE "SigningKeyRegistry" (
  "id" TEXT NOT NULL,
  "keyId" TEXT NOT NULL,
  "algorithm" TEXT NOT NULL,
  "publicKeyPem" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SigningKeyRegistry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SigningKeyRegistry_keyId_key"
  ON "SigningKeyRegistry"("keyId");

CREATE TABLE "VerificationAttempt" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "requestFingerprintHash" TEXT NOT NULL,
  "resultCode" TEXT NOT NULL,
  "targetType" TEXT,
  "authenticated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationAttempt_fingerprint_createdAt_idx"
  ON "VerificationAttempt"("requestFingerprintHash", "createdAt");
CREATE INDEX "VerificationAttempt_codeHash_createdAt_idx"
  ON "VerificationAttempt"("codeHash", "createdAt");

