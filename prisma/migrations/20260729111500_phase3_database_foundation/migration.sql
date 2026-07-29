-- CreateEnum
CREATE TYPE "FoundationRecordStatus" AS ENUM ('Draft', 'Published', 'Superseded', 'Archived');

-- CreateEnum
CREATE TYPE "IntegrityStatus" AS ENUM ('Pending', 'Verified', 'Mismatch', 'Missing');

-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('Pending', 'Running', 'Completed', 'Failed', 'DeadLetter');

-- CreateEnum
CREATE TYPE "CommentState" AS ENUM ('Open', 'Resolved', 'Verified', 'Closed', 'Reopened');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorSnapshot" JSONB,
ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "currentAuditHash" TEXT,
ADD COLUMN     "previousAuditHash" TEXT,
ADD COLUMN     "relevantHashes" JSONB;

-- CreateTable
CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "emailAtLink" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleWorkspaceIdentity" (
    "id" TEXT NOT NULL,
    "userIdentityId" TEXT NOT NULL,
    "googleSubject" TEXT NOT NULL,
    "hostedDomain" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "GoogleWorkspaceIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalPortalIdentity" (
    "id" TEXT NOT NULL,
    "userIdentityId" TEXT NOT NULL,
    "tokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastAuthenticatedAt" TIMESTAMP(3),

    CONSTRAINT "ExternalPortalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleGroupMapping" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "departmentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleGroupMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT,
    "departmentId" TEXT,
    "managerUserId" TEXT,
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inactiveAt" TIMESTAMP(3),

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSignatureAppearanceVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileObjectId" TEXT,
    "initialsFileObjectId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeSignatureAppearanceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "delegatorUserId" TEXT NOT NULL,
    "delegateUserId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyOverrideRequest" (
    "id" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyOverrideRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyOverrideApproval" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyOverrideApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecentAuthenticationEvidence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "authenticatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sessionHash" TEXT,

    CONSTRAINT "RecentAuthenticationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileObject" (
    "id" TEXT NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL,
    "providerKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksum" TEXT NOT NULL,
    "checksumAlgorithm" TEXT NOT NULL DEFAULT 'SHA-256',
    "pageCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FileObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceFileReference" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceFileReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveFileIdentity" (
    "id" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "sharedDriveId" TEXT,
    "parentFolderId" TEXT,
    "nameSnapshot" TEXT,
    "modifiedTime" TIMESTAMP(3),

    CONSTRAINT "DriveFileIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlledMainFile" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "integrityStatus" "IntegrityStatus" NOT NULL DEFAULT 'Pending',
    "controlledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "ControlledMainFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlledAttachment" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "attachmentKind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlledAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientResponseFile" (
    "id" TEXT NOT NULL,
    "clientResponseId" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "fileKind" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientResponseFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedArtifactRecord" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT,
    "fileObjectId" TEXT NOT NULL,
    "artifactKind" TEXT NOT NULL,
    "authoritative" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GeneratedArtifactRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileIntegrityCheck" (
    "id" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "status" "IntegrityStatus" NOT NULL,
    "expectedHash" TEXT NOT NULL,
    "observedHash" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "FileIntegrityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageFolderRule" (
    "id" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "folderKind" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageFolderRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "expectedSizeBytes" BIGINT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "checkedCount" INTEGER NOT NULL DEFAULT 0,
    "mismatchCount" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinitionVersion" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "FoundationRecordStatus" NOT NULL DEFAULT 'Draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowDefinitionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinitionStep" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "assignmentType" TEXT NOT NULL,
    "assignmentValue" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "quorum" INTEGER NOT NULL DEFAULT 1,
    "parallelGroupId" TEXT,

    CONSTRAINT "WorkflowDefinitionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowParallelGroup" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "quorum" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowParallelGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowSnapshot" (
    "id" TEXT NOT NULL,
    "definitionVersionId" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowSnapshotStep" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "assignmentSnapshot" JSONB NOT NULL,
    "required" BOOLEAN NOT NULL,
    "quorum" INTEGER NOT NULL,

    CONSTRAINT "WorkflowSnapshotStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalCycle" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contentHash" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStepInstance" (
    "id" TEXT NOT NULL,
    "approvalCycleId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "expectedStateVersion" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowStepInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAssignment" (
    "id" TEXT NOT NULL,
    "stepInstanceId" TEXT NOT NULL,
    "assigneeType" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "stepInstanceId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "expectedStateVersion" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "comments" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" TEXT NOT NULL,
    "stepInstanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignerReassignment" (
    "id" TEXT NOT NULL,
    "stepInstanceId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignerReassignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegationUse" (
    "id" TEXT NOT NULL,
    "delegationId" TEXT NOT NULL,
    "stepInstanceId" TEXT NOT NULL,
    "usedByUserId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DelegationUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeparationOfDutiesEvaluation" (
    "id" TEXT NOT NULL,
    "approvalCycleId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "evaluatedAssignments" JSONB NOT NULL,
    "overrideRequestId" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeparationOfDutiesEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoverTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "FoundationRecordStatus" NOT NULL DEFAULT 'Draft',
    "pageSize" TEXT NOT NULL,
    "orientation" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoverTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverLayoutElement" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "elementType" TEXT NOT NULL,
    "x" DECIMAL(65,30) NOT NULL,
    "y" DECIMAL(65,30) NOT NULL,
    "width" DECIMAL(65,30) NOT NULL,
    "height" DECIMAL(65,30) NOT NULL,
    "properties" JSONB,

    CONSTRAINT "CoverLayoutElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverFieldBinding" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "bindingPath" TEXT NOT NULL,
    "formatting" JSONB,

    CONSTRAINT "CoverFieldBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureBox" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "boxKey" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "workflowStepKey" TEXT,
    "x" DECIMAL(65,30) NOT NULL,
    "y" DECIMAL(65,30) NOT NULL,
    "width" DECIMAL(65,30) NOT NULL,
    "height" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "SignatureBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedCover" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "workflowSnapshotId" TEXT,
    "fileObjectId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedCover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverTemplateInheritanceRule" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CoverTemplateInheritanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageManifest" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "canonicalizationVersion" TEXT NOT NULL,
    "manifestJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageManifestItem" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "PackageManifestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageHash" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageHash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalEvidence" (
    "id" TEXT NOT NULL,
    "approvalDecisionId" TEXT NOT NULL,
    "reviewSessionId" TEXT,
    "stepInstanceId" TEXT NOT NULL,
    "identitySnapshot" JSONB NOT NULL,
    "roleSnapshot" JSONB NOT NULL,
    "declaration" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "packageHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSeal" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "signature" BYTEA NOT NULL,
    "status" "IntegrityStatus" NOT NULL DEFAULT 'Pending',
    "providerMetadata" JSONB,
    "sealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimestampEvidence" (
    "id" TEXT NOT NULL,
    "platformSealId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "token" BYTEA,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" "IntegrityStatus" NOT NULL DEFAULT 'Pending',

    CONSTRAINT "TimestampEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "result" "IntegrityStatus" NOT NULL,
    "checkedHashes" JSONB NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestFingerprintHash" TEXT,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicVerificationPolicy" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "version" INTEGER NOT NULL,
    "fields" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicVerificationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientResponseCodeSet" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientResponseCodeSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientResponseCodeSetVersion" (
    "id" TEXT NOT NULL,
    "codeSetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "FoundationRecordStatus" NOT NULL DEFAULT 'Draft',
    "publishedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "ClientResponseCodeSetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientResponseCode" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "externalCode" TEXT NOT NULL,
    "exactWording" TEXT NOT NULL,
    "internalLabel" TEXT NOT NULL,
    "outcomeClass" TEXT NOT NULL,
    "countsAsApproved" BOOLEAN NOT NULL DEFAULT false,
    "finalApproval" BOOLEAN NOT NULL DEFAULT false,
    "requiresCommentRectification" BOOLEAN NOT NULL DEFAULT false,
    "requiresNewRevision" BOOLEAN NOT NULL DEFAULT false,
    "requiresInternalReapproval" BOOLEAN NOT NULL DEFAULT false,
    "requiresResubmission" BOOLEAN NOT NULL DEFAULT false,
    "allowsTemporaryUse" BOOLEAN NOT NULL DEFAULT false,
    "allowsLifecycleClosure" BOOLEAN NOT NULL DEFAULT false,
    "requiresNewDocumentNumber" BOOLEAN NOT NULL DEFAULT false,
    "requiresReturnedFile" BOOLEAN NOT NULL DEFAULT false,
    "expectedPrimaryFileKind" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,

    CONSTRAINT "ClientResponseCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectResponseCodeConfiguration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "codeSetVersionId" TEXT NOT NULL,
    "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectResponseCodeConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientResponsePolicySnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "codeSetVersionId" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientResponsePolicySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientResponse" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "policySnapshotId" TEXT NOT NULL,
    "responseCodeId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,
    "primaryFileObjectId" TEXT,

    CONSTRAINT "ClientResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientResponseAttachment" (
    "id" TEXT NOT NULL,
    "clientResponseId" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "attachmentKind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientResponseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSubmission" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "transmittalId" TEXT,
    "submissionNumber" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "packageManifestId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "state" "CommentState" NOT NULL DEFAULT 'Open',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentLocation" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "locationType" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "coordinates" JSONB,
    "selectedText" TEXT,

    CONSTRAINT "CommentLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentAssignment" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "assigneeType" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentStatusEvent" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "fromState" "CommentState",
    "toState" "CommentState" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentAttachment" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "correlationId" TEXT,
    "state" "JobState" NOT NULL DEFAULT 'Pending',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'Pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "error" JSONB,

    CONSTRAINT "JobAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "targetHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'Pending',
    "attemptedAt" TIMESTAMP(3),
    "responseMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationClient" (
    "id" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationScope" (
    "id" TEXT NOT NULL,
    "integrationClientId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "integrationClientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "eventTypes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "outboxEventId" TEXT NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'Pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionRule" (
    "id" TEXT NOT NULL,
    "recordClass" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "disposition" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationVersion" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigurationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditIntegrityCheckpoint" (
    "id" TEXT NOT NULL,
    "lastAuditLogId" TEXT NOT NULL,
    "lastAuditHash" TEXT NOT NULL,
    "checkpointHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AuditIntegrityCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_provider_subject_key" ON "UserIdentity"("provider", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleWorkspaceIdentity_userIdentityId_key" ON "GoogleWorkspaceIdentity"("userIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleWorkspaceIdentity_googleSubject_key" ON "GoogleWorkspaceIdentity"("googleSubject");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPortalIdentity_userIdentityId_key" ON "ExternalPortalIdentity"("userIdentityId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPortalIdentity_tokenHash_key" ON "ExternalPortalIdentity"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleGroupMapping_groupId_key" ON "GoogleGroupMapping"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_employeeCode_key" ON "EmployeeProfile"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSignatureAppearanceVersion_userId_version_key" ON "EmployeeSignatureAppearanceVersion"("userId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Delegation_delegatorUserId_startsAt_endsAt_idx" ON "Delegation"("delegatorUserId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyOverrideApproval_requestId_approverUserId_key" ON "EmergencyOverrideApproval"("requestId", "approverUserId");

-- CreateIndex
CREATE INDEX "RecentAuthenticationEvidence_userId_expiresAt_idx" ON "RecentAuthenticationEvidence"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "FileObject_checksum_idx" ON "FileObject"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "FileObject_storageProvider_providerKey_key" ON "FileObject"("storageProvider", "providerKey");

-- CreateIndex
CREATE INDEX "SourceFileReference_revisionId_idx" ON "SourceFileReference"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "DriveFileIdentity_fileObjectId_key" ON "DriveFileIdentity"("fileObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "DriveFileIdentity_driveFileId_key" ON "DriveFileIdentity"("driveFileId");

-- CreateIndex
CREATE UNIQUE INDEX "ControlledMainFile_fileObjectId_key" ON "ControlledMainFile"("fileObjectId");

-- CreateIndex
CREATE INDEX "ControlledMainFile_revisionId_isActive_idx" ON "ControlledMainFile"("revisionId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ControlledAttachment_fileObjectId_key" ON "ControlledAttachment"("fileObjectId");

-- CreateIndex
CREATE INDEX "ControlledAttachment_revisionId_idx" ON "ControlledAttachment"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseFile_fileObjectId_key" ON "ClientResponseFile"("fileObjectId");

-- CreateIndex
CREATE INDEX "ClientResponseFile_clientResponseId_idx" ON "ClientResponseFile"("clientResponseId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedArtifactRecord_fileObjectId_key" ON "GeneratedArtifactRecord"("fileObjectId");

-- CreateIndex
CREATE INDEX "FileIntegrityCheck_fileObjectId_checkedAt_idx" ON "FileIntegrityCheck"("fileObjectId", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StorageFolderRule_scopeType_scopeId_folderKind_version_key" ON "StorageFolderRule"("scopeType", "scopeId", "folderKind", "version");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_code_key" ON "WorkflowDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinitionVersion_definitionId_version_key" ON "WorkflowDefinitionVersion"("definitionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinitionStep_versionId_stepKey_key" ON "WorkflowDefinitionStep"("versionId", "stepKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowParallelGroup_versionId_groupKey_key" ON "WorkflowParallelGroup"("versionId", "groupKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowSnapshot_snapshotHash_key" ON "WorkflowSnapshot"("snapshotHash");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowSnapshotStep_snapshotId_stepKey_key" ON "WorkflowSnapshotStep"("snapshotId", "stepKey");

-- CreateIndex
CREATE INDEX "ApprovalCycle_revisionId_isActive_idx" ON "ApprovalCycle"("revisionId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalCycle_revisionId_cycleNumber_key" ON "ApprovalCycle"("revisionId", "cycleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStepInstance_approvalCycleId_stepKey_key" ON "WorkflowStepInstance"("approvalCycleId", "stepKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowAssignment_stepInstanceId_assigneeType_assigneeId_key" ON "WorkflowAssignment"("stepInstanceId", "assigneeType", "assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalDecision_idempotencyKey_key" ON "ApprovalDecision"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ApprovalDecision_stepInstanceId_decidedAt_idx" ON "ApprovalDecision"("stepInstanceId", "decidedAt");

-- CreateIndex
CREATE INDEX "ReviewSession_stepInstanceId_userId_idx" ON "ReviewSession"("stepInstanceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DelegationUse_delegationId_stepInstanceId_key" ON "DelegationUse"("delegationId", "stepInstanceId");

-- CreateIndex
CREATE INDEX "SeparationOfDutiesEvaluation_approvalCycleId_idx" ON "SeparationOfDutiesEvaluation"("approvalCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "CoverTemplate_code_key" ON "CoverTemplate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CoverTemplateVersion_templateId_version_key" ON "CoverTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CoverFieldBinding_versionId_fieldKey_key" ON "CoverFieldBinding"("versionId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureBox_versionId_boxKey_key" ON "SignatureBox"("versionId", "boxKey");

-- CreateIndex
CREATE INDEX "GeneratedCover_revisionId_idx" ON "GeneratedCover"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "CoverTemplateInheritanceRule_templateId_scopeType_scopeId_key" ON "CoverTemplateInheritanceRule"("templateId", "scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "PackageManifest_revisionId_schemaVersion_canonicalizationVe_key" ON "PackageManifest"("revisionId", "schemaVersion", "canonicalizationVersion");

-- CreateIndex
CREATE UNIQUE INDEX "PackageManifestItem_manifestId_itemKey_key" ON "PackageManifestItem"("manifestId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "PackageHash_manifestId_algorithm_key" ON "PackageHash"("manifestId", "algorithm");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalEvidence_approvalDecisionId_key" ON "ApprovalEvidence"("approvalDecisionId");

-- CreateIndex
CREATE INDEX "PlatformSeal_manifestId_idx" ON "PlatformSeal"("manifestId");

-- CreateIndex
CREATE INDEX "VerificationRecord_manifestId_verifiedAt_idx" ON "VerificationRecord"("manifestId", "verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCode_codeHash_key" ON "VerificationCode"("codeHash");

-- CreateIndex
CREATE INDEX "VerificationCode_manifestId_idx" ON "VerificationCode"("manifestId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicVerificationPolicy_projectId_version_key" ON "PublicVerificationPolicy"("projectId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseCodeSet_clientId_code_key" ON "ClientResponseCodeSet"("clientId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseCodeSetVersion_codeSetId_version_key" ON "ClientResponseCodeSetVersion"("codeSetId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseCode_versionId_externalCode_key" ON "ClientResponseCode"("versionId", "externalCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectResponseCodeConfiguration_projectId_key" ON "ProjectResponseCodeConfiguration"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponsePolicySnapshot_snapshotHash_key" ON "ClientResponsePolicySnapshot"("snapshotHash");

-- CreateIndex
CREATE INDEX "ClientResponse_revisionId_receivedAt_idx" ON "ClientResponse"("revisionId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseAttachment_clientResponseId_fileObjectId_key" ON "ClientResponseAttachment"("clientResponseId", "fileObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSubmission_revisionId_submissionNumber_key" ON "ClientSubmission"("revisionId", "submissionNumber");

-- CreateIndex
CREATE INDEX "Comment_revisionId_state_idx" ON "Comment"("revisionId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "CommentLocation_commentId_key" ON "CommentLocation"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentAssignment_commentId_assigneeType_assigneeId_key" ON "CommentAssignment"("commentId", "assigneeType", "assigneeId");

-- CreateIndex
CREATE INDEX "CommentStatusEvent_commentId_createdAt_idx" ON "CommentStatusEvent"("commentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommentAttachment_commentId_fileObjectId_key" ON "CommentAttachment"("commentId", "fileObjectId");

-- CreateIndex
CREATE INDEX "OutboxEvent_state_availableAt_idx" ON "OutboxEvent"("state", "availableAt");

-- CreateIndex
CREATE INDEX "BackgroundJob_state_nextAttemptAt_priority_idx" ON "BackgroundJob"("state", "nextAttemptAt", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "JobAttempt_jobId_attemptNumber_key" ON "JobAttempt"("jobId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAttempt_idempotencyKey_key" ON "DeliveryAttempt"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_clientId_scope_key_key" ON "IdempotencyRecord"("clientId", "scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationClient_clientKey_key" ON "IntegrationClient"("clientKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationScope_integrationClientId_scope_key" ON "IntegrationScope"("integrationClientId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_endpointId_outboxEventId_key" ON "WebhookDelivery"("endpointId", "outboxEventId");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionRule_recordClass_version_key" ON "RetentionRule"("recordClass", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationVersion_scope_scopeId_version_key" ON "ConfigurationVersion"("scope", "scopeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AuditIntegrityCheckpoint_checkpointHash_key" ON "AuditIntegrityCheckpoint"("checkpointHash");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_currentAuditHash_key" ON "AuditLog"("currentAuditHash");

-- AddForeignKey
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleWorkspaceIdentity" ADD CONSTRAINT "GoogleWorkspaceIdentity_userIdentityId_fkey" FOREIGN KEY ("userIdentityId") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPortalIdentity" ADD CONSTRAINT "ExternalPortalIdentity_userIdentityId_fkey" FOREIGN KEY ("userIdentityId") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSignatureAppearanceVersion" ADD CONSTRAINT "EmployeeSignatureAppearanceVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledMainFile" ADD CONSTRAINT "ControlledMainFile_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DocumentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledMainFile" ADD CONSTRAINT "ControlledMainFile_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledAttachment" ADD CONSTRAINT "ControlledAttachment_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDefinitionVersion" ADD CONSTRAINT "WorkflowDefinitionVersion_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDefinitionStep" ADD CONSTRAINT "WorkflowDefinitionStep_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "WorkflowDefinitionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSnapshot" ADD CONSTRAINT "WorkflowSnapshot_definitionVersionId_fkey" FOREIGN KEY ("definitionVersionId") REFERENCES "WorkflowDefinitionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSnapshotStep" ADD CONSTRAINT "WorkflowSnapshotStep_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WorkflowSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 3 invariants not expressible as Prisma schema attributes.
CREATE UNIQUE INDEX "ControlledMainFile_one_active_per_revision"
ON "ControlledMainFile" ("revisionId")
WHERE "isActive" = true AND "supersededAt" IS NULL;

CREATE UNIQUE INDEX "ApprovalCycle_one_active_per_revision"
ON "ApprovalCycle" ("revisionId")
WHERE "isActive" = true AND "completedAt" IS NULL;

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

CREATE TRIGGER "WorkflowDefinitionVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "WorkflowDefinitionVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_version_mutation"();

CREATE TRIGGER "CoverTemplateVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "CoverTemplateVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_version_mutation"();

CREATE TRIGGER "ClientResponseCodeSetVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "ClientResponseCodeSetVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_version_mutation"();

CREATE OR REPLACE FUNCTION "prevent_audit_log_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_append_only"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION "prevent_audit_log_mutation"();

-- AddForeignKey
ALTER TABLE "ApprovalCycle" ADD CONSTRAINT "ApprovalCycle_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DocumentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalCycle" ADD CONSTRAINT "ApprovalCycle_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WorkflowSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepInstance" ADD CONSTRAINT "WorkflowStepInstance_approvalCycleId_fkey" FOREIGN KEY ("approvalCycleId") REFERENCES "ApprovalCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverTemplateVersion" ADD CONSTRAINT "CoverTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CoverTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverLayoutElement" ADD CONSTRAINT "CoverLayoutElement_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CoverTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverFieldBinding" ADD CONSTRAINT "CoverFieldBinding_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CoverTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureBox" ADD CONSTRAINT "SignatureBox_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CoverTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageManifest" ADD CONSTRAINT "PackageManifest_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DocumentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageManifestItem" ADD CONSTRAINT "PackageManifestItem_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "PackageManifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageHash" ADD CONSTRAINT "PackageHash_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "PackageManifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientResponseCodeSetVersion" ADD CONSTRAINT "ClientResponseCodeSetVersion_codeSetId_fkey" FOREIGN KEY ("codeSetId") REFERENCES "ClientResponseCodeSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientResponseCode" ADD CONSTRAINT "ClientResponseCode_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ClientResponseCodeSetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "prevent_published_workflow_content_mutation"()
RETURNS trigger AS $$
DECLARE
  parent_status "FoundationRecordStatus";
  parent_version_id TEXT;
BEGIN
  parent_version_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD."versionId"
    ELSE NEW."versionId"
  END;
  SELECT "status" INTO parent_status
  FROM "WorkflowDefinitionVersion"
  WHERE "id" = parent_version_id;
  IF parent_status = 'Published' THEN
    RAISE EXCEPTION 'Published workflow content is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WorkflowDefinitionStep_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "WorkflowDefinitionStep"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_workflow_content_mutation"();

CREATE TRIGGER "WorkflowParallelGroup_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "WorkflowParallelGroup"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_workflow_content_mutation"();

CREATE OR REPLACE FUNCTION "prevent_published_cover_content_mutation"()
RETURNS trigger AS $$
DECLARE
  parent_status "FoundationRecordStatus";
  parent_version_id TEXT;
BEGIN
  parent_version_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD."versionId"
    ELSE NEW."versionId"
  END;
  SELECT "status" INTO parent_status
  FROM "CoverTemplateVersion"
  WHERE "id" = parent_version_id;
  IF parent_status = 'Published' THEN
    RAISE EXCEPTION 'Published cover content is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CoverLayoutElement_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "CoverLayoutElement"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_cover_content_mutation"();

CREATE TRIGGER "CoverFieldBinding_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "CoverFieldBinding"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_cover_content_mutation"();

CREATE TRIGGER "SignatureBox_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "SignatureBox"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_cover_content_mutation"();

CREATE OR REPLACE FUNCTION "prevent_published_response_code_mutation"()
RETURNS trigger AS $$
DECLARE
  parent_status "FoundationRecordStatus";
  parent_version_id TEXT;
BEGIN
  parent_version_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD."versionId"
    ELSE NEW."versionId"
  END;
  SELECT "status" INTO parent_status
  FROM "ClientResponseCodeSetVersion"
  WHERE "id" = parent_version_id;
  IF parent_status = 'Published' THEN
    RAISE EXCEPTION 'Published response-code content is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ClientResponseCode_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "ClientResponseCode"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_response_code_mutation"();
