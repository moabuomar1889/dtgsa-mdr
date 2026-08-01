-- CreateEnum
CREATE TYPE "PdiImportOutcome" AS ENUM ('Added', 'ClientNumberAssigned', 'Unchanged', 'Conflict', 'Error');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "logoBase64" TEXT,
ADD COLUMN     "logoByteSize" INTEGER,
ADD COLUMN     "logoFileName" TEXT,
ADD COLUMN     "logoMimeType" TEXT;

-- CreateTable
CREATE TABLE "PdiImportRun" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "importedByUserId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSha256" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "addedCount" INTEGER NOT NULL DEFAULT 0,
    "numberedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdiImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdiImportRunResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "outcome" "PdiImportOutcome" NOT NULL,
    "dtgsaDocumentNumber" TEXT,
    "clientDocumentNumber" TEXT,
    "title" TEXT,
    "detail" TEXT,
    "pdiItemId" TEXT,

    CONSTRAINT "PdiImportRunResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PdiImportRun_registerId_createdAt_idx" ON "PdiImportRun"("registerId", "createdAt");

-- CreateIndex
CREATE INDEX "PdiImportRunResult_runId_outcome_idx" ON "PdiImportRunResult"("runId", "outcome");

-- AddForeignKey
ALTER TABLE "PdiImportRun" ADD CONSTRAINT "PdiImportRun_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "PdiRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdiImportRunResult" ADD CONSTRAINT "PdiImportRunResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PdiImportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
