-- CreateEnum
CREATE TYPE "AuthMode" AS ENUM ('LEGACY_SUPABASE', 'DUAL_TRANSITION', 'GOOGLE_WORKSPACE');

-- CreateEnum
CREATE TYPE "PortalTokenUsePolicy" AS ENUM ('OneTime', 'Reusable');

-- CreateEnum
CREATE TYPE "DirectorySyncStatus" AS ENUM ('Running', 'Completed', 'Failed', 'DryRun');

-- AlterTable
ALTER TABLE "GoogleGroupMapping" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "RecentAuthenticationEvidence" ADD COLUMN     "consumedAt" TIMESTAMP(3),
ADD COLUMN     "internalSessionId" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkflowAssignment" ADD COLUMN     "reassignmentReason" TEXT,
ADD COLUMN     "reassignmentRequiredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "InternalAuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "authMode" "AuthMode" NOT NULL,
    "authenticatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "rotatedFromId" TEXT,
    "csrfTokenHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgentHash" TEXT,

    CONSTRAINT "InternalAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OidcAuthorizationTransaction" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "codeVerifierCiphertext" TEXT NOT NULL,
    "codeVerifierIv" TEXT NOT NULL,
    "codeVerifierAuthTag" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "returnTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "OidcAuthorizationTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalPortalInvitation" (
    "id" TEXT NOT NULL,
    "externalIdentityId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "usePolicy" "PortalTokenUsePolicy" NOT NULL DEFAULT 'OneTime',
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "ExternalPortalInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalPortalInvitationPdiItem" (
    "invitationId" TEXT NOT NULL,
    "pdiItemId" TEXT NOT NULL,

    CONSTRAINT "ExternalPortalInvitationPdiItem_pkey" PRIMARY KEY ("invitationId","pdiItemId")
);

-- CreateTable
CREATE TABLE "ExternalPortalSession" (
    "id" TEXT NOT NULL,
    "externalIdentityId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfTokenHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "userAgentHash" TEXT,

    CONSTRAINT "ExternalPortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectorySyncRun" (
    "id" TEXT NOT NULL,
    "status" "DirectorySyncStatus" NOT NULL DEFAULT 'Running',
    "isDryRun" BOOLEAN NOT NULL DEFAULT false,
    "cursor" TEXT,
    "usersSeen" INTEGER NOT NULL DEFAULT 0,
    "usersChanged" INTEGER NOT NULL DEFAULT 0,
    "groupsSeen" INTEGER NOT NULL DEFAULT 0,
    "groupsChanged" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DirectorySyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleGroupMappingVersion" (
    "id" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleGroupMappingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityRoleOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "projectId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Admin',
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inactiveAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "IdentityRoleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdGrant" BOOLEAN NOT NULL DEFAULT false,
    "activeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inactiveAt" TIMESTAMP(3),

    CONSTRAINT "DirectoryRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityLinkReview" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "subjectHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "candidateUserIds" JSONB NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolution" JSONB,

    CONSTRAINT "IdentityLinkReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthenticationRateLimit" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthenticationRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalAuthSession_tokenHash_key" ON "InternalAuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "InternalAuthSession_userId_expiresAt_idx" ON "InternalAuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "InternalAuthSession_revokedAt_expiresAt_idx" ON "InternalAuthSession"("revokedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OidcAuthorizationTransaction_stateHash_key" ON "OidcAuthorizationTransaction"("stateHash");

-- CreateIndex
CREATE INDEX "OidcAuthorizationTransaction_expiresAt_consumedAt_idx" ON "OidcAuthorizationTransaction"("expiresAt", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPortalInvitation_tokenHash_key" ON "ExternalPortalInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "ExternalPortalInvitation_clientId_projectId_expiresAt_idx" ON "ExternalPortalInvitation"("clientId", "projectId", "expiresAt");

-- CreateIndex
CREATE INDEX "ExternalPortalInvitation_externalIdentityId_revokedAt_idx" ON "ExternalPortalInvitation"("externalIdentityId", "revokedAt");

-- CreateIndex
CREATE INDEX "ExternalPortalInvitationPdiItem_pdiItemId_idx" ON "ExternalPortalInvitationPdiItem"("pdiItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPortalSession_tokenHash_key" ON "ExternalPortalSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ExternalPortalSession_externalIdentityId_expiresAt_idx" ON "ExternalPortalSession"("externalIdentityId", "expiresAt");

-- CreateIndex
CREATE INDEX "ExternalPortalSession_clientId_projectId_expiresAt_idx" ON "ExternalPortalSession"("clientId", "projectId", "expiresAt");

-- CreateIndex
CREATE INDEX "DirectorySyncRun_status_startedAt_idx" ON "DirectorySyncRun"("status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleGroupMappingVersion_mappingId_version_key" ON "GoogleGroupMappingVersion"("mappingId", "version");

-- CreateIndex
CREATE INDEX "IdentityRoleOverride_userId_activeFrom_inactiveAt_idx" ON "IdentityRoleOverride"("userId", "activeFrom", "inactiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityRoleOverride_userId_roleCode_projectId_activeFrom_key" ON "IdentityRoleOverride"("userId", "roleCode", "projectId", "activeFrom");

-- CreateIndex
CREATE INDEX "DirectoryRoleAssignment_userId_inactiveAt_idx" ON "DirectoryRoleAssignment"("userId", "inactiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryRoleAssignment_userId_mappingId_key" ON "DirectoryRoleAssignment"("userId", "mappingId");

-- CreateIndex
CREATE INDEX "IdentityLinkReview_status_requestedAt_idx" ON "IdentityLinkReview"("status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityLinkReview_provider_subjectHash_status_key" ON "IdentityLinkReview"("provider", "subjectHash", "status");

-- CreateIndex
CREATE INDEX "AuthenticationRateLimit_lockedUntil_idx" ON "AuthenticationRateLimit"("lockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "AuthenticationRateLimit_scope_keyHash_key" ON "AuthenticationRateLimit"("scope", "keyHash");

-- CreateIndex
CREATE INDEX "RecentAuthenticationEvidence_internalSessionId_expiresAt_idx" ON "RecentAuthenticationEvidence"("internalSessionId", "expiresAt");

-- AddForeignKey
ALTER TABLE "RecentAuthenticationEvidence" ADD CONSTRAINT "RecentAuthenticationEvidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentAuthenticationEvidence" ADD CONSTRAINT "RecentAuthenticationEvidence_internalSessionId_fkey" FOREIGN KEY ("internalSessionId") REFERENCES "InternalAuthSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalAuthSession" ADD CONSTRAINT "InternalAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalAuthSession" ADD CONSTRAINT "InternalAuthSession_rotatedFromId_fkey" FOREIGN KEY ("rotatedFromId") REFERENCES "InternalAuthSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPortalInvitation" ADD CONSTRAINT "ExternalPortalInvitation_externalIdentityId_fkey" FOREIGN KEY ("externalIdentityId") REFERENCES "ExternalPortalIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPortalInvitation" ADD CONSTRAINT "ExternalPortalInvitation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPortalInvitationPdiItem" ADD CONSTRAINT "ExternalPortalInvitationPdiItem_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "ExternalPortalInvitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPortalSession" ADD CONSTRAINT "ExternalPortalSession_externalIdentityId_fkey" FOREIGN KEY ("externalIdentityId") REFERENCES "ExternalPortalIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPortalSession" ADD CONSTRAINT "ExternalPortalSession_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "ExternalPortalInvitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleGroupMappingVersion" ADD CONSTRAINT "GoogleGroupMappingVersion_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "GoogleGroupMapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityRoleOverride" ADD CONSTRAINT "IdentityRoleOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryRoleAssignment" ADD CONSTRAINT "DirectoryRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryRoleAssignment" ADD CONSTRAINT "DirectoryRoleAssignment_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "GoogleGroupMapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryRoleAssignment" ADD CONSTRAINT "DirectoryRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InternalAuthSession"
ADD CONSTRAINT "InternalAuthSession_valid_expiry"
CHECK ("expiresAt" > "createdAt");

ALTER TABLE "ExternalPortalInvitation"
ADD CONSTRAINT "ExternalPortalInvitation_valid_limits"
CHECK (
  "expiresAt" > "createdAt"
  AND "maxAttempts" > 0
  AND "failedAttempts" >= 0
  AND "useCount" >= 0
);

ALTER TABLE "ExternalPortalSession"
ADD CONSTRAINT "ExternalPortalSession_valid_expiry"
CHECK ("expiresAt" > "createdAt");

CREATE OR REPLACE FUNCTION "prevent_google_subject_mutation"()
RETURNS trigger AS $$
BEGIN
  IF NEW."googleSubject" IS DISTINCT FROM OLD."googleSubject"
    OR NEW."userIdentityId" IS DISTINCT FROM OLD."userIdentityId" THEN
    RAISE EXCEPTION 'Google subject mappings are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GoogleWorkspaceIdentity_subject_immutable"
BEFORE UPDATE ON "GoogleWorkspaceIdentity"
FOR EACH ROW EXECUTE FUNCTION "prevent_google_subject_mutation"();

CREATE OR REPLACE FUNCTION "prevent_group_mapping_version_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Google group mapping versions are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GoogleGroupMappingVersion_append_only"
BEFORE UPDATE OR DELETE ON "GoogleGroupMappingVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_group_mapping_version_mutation"();
