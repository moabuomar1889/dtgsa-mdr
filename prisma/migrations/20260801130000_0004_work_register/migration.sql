-- CreateEnum
CREATE TYPE "WorkRegisterStatus" AS ENUM ('Reported', 'Investigating', 'Planned', 'InProgress', 'Blocked', 'Fixed', 'Verified', 'Closed');

-- CreateEnum
CREATE TYPE "WorkRegisterPriority" AS ENUM ('Critical', 'High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "WorkRegisterCategory" AS ENUM ('Bug', 'Workflow', 'UserExperience', 'Performance', 'Data', 'Security', 'Feature', 'Other');

-- CreateEnum
CREATE TYPE "WorkRegisterActivityKind" AS ENUM ('Created', 'Comment', 'StatusChanged', 'EvidenceUpdated');

-- CreateEnum
CREATE TYPE "WorkRegisterDeploymentStatus" AS ENUM ('NotDeployed', 'Staging', 'Production');

-- CreateTable
CREATE TABLE "WorkRegisterItem" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "area" TEXT,
    "category" "WorkRegisterCategory" NOT NULL,
    "priority" "WorkRegisterPriority" NOT NULL DEFAULT 'Medium',
    "status" "WorkRegisterStatus" NOT NULL DEFAULT 'Reported',
    "workPack" TEXT,
    "reporterUserId" TEXT NOT NULL,
    "assigneeUserId" TEXT,
    "rootCause" TEXT,
    "fixSummary" TEXT,
    "fileReferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "testEvidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "commitSha" TEXT,
    "deploymentStatus" "WorkRegisterDeploymentStatus" NOT NULL DEFAULT 'NotDeployed',
    "remainingRisks" TEXT,
    "startedAt" TIMESTAMP(3),
    "fixedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkRegisterItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkRegisterActivity" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "kind" "WorkRegisterActivityKind" NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkRegisterActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkRegisterItem_sequence_key" ON "WorkRegisterItem"("sequence");

-- CreateIndex
CREATE INDEX "WorkRegisterItem_status_updatedAt_idx" ON "WorkRegisterItem"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkRegisterItem_category_updatedAt_idx" ON "WorkRegisterItem"("category", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkRegisterItem_priority_updatedAt_idx" ON "WorkRegisterItem"("priority", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkRegisterItem_workPack_idx" ON "WorkRegisterItem"("workPack");

-- CreateIndex
CREATE INDEX "WorkRegisterActivity_itemId_createdAt_idx" ON "WorkRegisterActivity"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkRegisterActivity_actorUserId_createdAt_idx" ON "WorkRegisterActivity"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkRegisterItem" ADD CONSTRAINT "WorkRegisterItem_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRegisterItem" ADD CONSTRAINT "WorkRegisterItem_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRegisterActivity" ADD CONSTRAINT "WorkRegisterActivity_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "WorkRegisterItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRegisterActivity" ADD CONSTRAINT "WorkRegisterActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
