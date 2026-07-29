-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ScopeLevel" AS ENUM ('Global', 'Client', 'Project');

-- CreateEnum
CREATE TYPE "NumberingSequenceScope" AS ENUM ('GLOBAL', 'PER_PROJECT', 'PER_DISCIPLINE', 'PER_DOC_TYPE', 'CUSTOM_KEY');

-- CreateEnum
CREATE TYPE "NumberingTokenType" AS ENUM ('Literal', 'ClientCode', 'ProjectCode', 'DisciplineCode', 'DocumentTypeCode', 'ReleasePurposeCode', 'Sequence', 'Revision', 'CustomField');

-- CreateEnum
CREATE TYPE "PdiStatus" AS ENUM ('Draft', 'SentToClient', 'ClientNumberPending', 'ClientNumberReceived', 'ConvertedToMdr', 'Archived');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('Draft', 'Uploaded', 'PendingReview', 'ReviewRejected', 'PendingApproval', 'ApprovalRejected', 'ReadyForDcCheck', 'DcReturnedForCorrection', 'ReadyToSubmit', 'SubmittedToClient');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('Original', 'RevisionInProgress', 'Resubmitted', 'Superseded', 'Closed');

-- CreateEnum
CREATE TYPE "ClientReplyState" AS ENUM ('WaitingClientReply', 'ReplyReceived', 'RevisionRequired', 'NoFurtherSubmittal', 'InformationOnly');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('Prepared', 'Reviewed', 'Approved', 'DcCheck');

-- CreateEnum
CREATE TYPE "WorkflowStepStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Skipped');

-- CreateEnum
CREATE TYPE "WorkflowActionType" AS ENUM ('Created', 'Uploaded', 'SubmittedForReview', 'ReviewApproved', 'ReviewRejected', 'SubmittedForApproval', 'ApprovalApproved', 'ApprovalRejected', 'ReturnedForCorrection', 'DcValidated', 'SubmittedToClient', 'ClientReplyRecorded', 'RevisionTriggered', 'Locked', 'Unlocked');

-- CreateEnum
CREATE TYPE "CoverSheetKind" AS ENUM ('DTGSA_COVER', 'CLIENT_COVER');

-- CreateEnum
CREATE TYPE "DocumentFileType" AS ENUM ('SOURCE', 'DTG_COVER', 'CLIENT_COVER', 'MERGED', 'TRANSMITTAL', 'CLIENT_REPLY', 'REJECTED', 'REVISION_SOURCE', 'PREVIEW');

-- CreateEnum
CREATE TYPE "GeneratedDocumentKind" AS ENUM ('DTGSA_COVER_PDF', 'CLIENT_COVER_PDF', 'MERGED_PDF', 'TRANSMITTAL_PDF', 'PREVIEW_PDF');

-- CreateEnum
CREATE TYPE "TransmittalStatus" AS ENUM ('Draft', 'ReadyToSend', 'Sent', 'Cancelled');

-- CreateEnum
CREATE TYPE "ClientReplyNextAction" AS ENUM ('REVISION_REQUIRED', 'NEW_DOCUMENT_NUMBER_REQUIRED', 'NO_FURTHER_ACTION');

-- CreateEnum
CREATE TYPE "ClientResponseOutcomeClass" AS ENUM ('REJECTED', 'REJECTED_WITH_COMMENTS', 'CONDITIONALLY_APPROVED', 'APPROVED_WITH_COMMENTS', 'REVISION_REQUIRED', 'FINAL_APPROVED', 'INFORMATION_ONLY', 'HOLD', 'CANCELLED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ClientResponseFileKind" AS ENUM ('FULL_DOCUMENT', 'COVER_ONLY', 'COMMENT_SHEET', 'APPROVAL_LETTER', 'RESPONSE_FORM', 'TRANSMITTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DriveFolderType" AS ENUM ('ROOT', 'DOCUMENT_CONTROL', 'PDI', 'MDR', 'SUBMITTED', 'RECEIVED', 'REJECTED', 'TRANSMITTALS', 'REVISIONS');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('InApp', 'Email');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('Pending', 'Sent', 'Read', 'Failed');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('Info', 'Warning', 'Critical');

-- CreateEnum
CREATE TYPE "SystemSeverity" AS ENUM ('Info', 'Warning', 'Error', 'Critical');

-- CreateEnum
CREATE TYPE "DisciplineAssignmentType" AS ENUM ('PreparedBy', 'ReviewedBy', 'ApprovedBy');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('GOOGLE_DRIVE_CONTROLLED', 'GOOGLE_DRIVE_SOURCE', 'LOCAL_CONTROLLED_FILESYSTEM', 'LOCAL_SOURCE_FILESYSTEM', 'LOCAL_TEMPORARY_ARTIFACT');

-- CreateEnum
CREATE TYPE "FoundationRecordStatus" AS ENUM ('Draft', 'Published', 'Superseded', 'Archived');

-- CreateEnum
CREATE TYPE "IntegrityStatus" AS ENUM ('Pending', 'Verified', 'Mismatch', 'Missing', 'TamperDetected', 'PermissionDrift', 'Trashed');

-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('Pending', 'Running', 'Completed', 'Failed', 'DeadLetter', 'Canceled');

-- CreateEnum
CREATE TYPE "CommentState" AS ENUM ('Open', 'Resolved', 'Verified', 'Closed', 'Reopened');

-- CreateEnum
CREATE TYPE "AuthMode" AS ENUM ('GOOGLE_WORKSPACE', 'LOCAL_ACCEPTANCE_IDENTITY');

-- CreateEnum
CREATE TYPE "PortalTokenUsePolicy" AS ENUM ('OneTime', 'Reusable');

-- CreateEnum
CREATE TYPE "DirectorySyncStatus" AS ENUM ('Running', 'Completed', 'Failed', 'DryRun');

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProjectRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProjectRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signatureStorageProvider" "StorageProvider",
    "signatureProviderKey" TEXT,
    "initialsStorageProvider" "StorageProvider",
    "initialsProviderKey" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signatureProfileId" TEXT,
    "userDisplayNameSnapshot" TEXT NOT NULL,
    "roleSnapshot" TEXT NOT NULL,
    "targetEntityType" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "workflowStepType" "WorkflowStepType" NOT NULL,
    "signatureStorageProvider" "StorageProvider",
    "signatureProviderKey" TEXT,
    "initialsStorageProvider" "StorageProvider",
    "initialsProviderKey" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL,
    "signatureHash" TEXT NOT NULL,
    "auditLogId" TEXT,

    CONSTRAINT "SignatureEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultTimezone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSetting" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "defaultUploadMaxMb" INTEGER,
    "defaultTransmittalMaxMb" INTEGER,
    "settings" JSONB,
    "workflowDefaults" JSONB,
    "emailTemplates" JSONB,
    "templateSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "driveProjectName" TEXT,
    "contractNumber" TEXT,
    "description" TEXT,
    "timezone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSetting" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "inheritClientSettings" BOOLEAN NOT NULL DEFAULT true,
    "uploadMaxMbOverride" INTEGER,
    "transmittalMaxTotalMbOverride" INTEGER,
    "rejectedFileIdentifierStrategy" TEXT NOT NULL DEFAULT 'DTGSA_DOCUMENT_NUMBER',
    "settings" JSONB,
    "workflowDefaults" JSONB,
    "templateOverrides" JSONB,
    "approvalMatrix" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discipline" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientDiscipline" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "codeOverride" TEXT,
    "nameOverride" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientDiscipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDiscipline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "clientDisciplineId" TEXT,
    "codeOverride" TEXT,
    "nameOverride" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDiscipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDisciplineAssignment" (
    "id" TEXT NOT NULL,
    "projectDisciplineId" TEXT NOT NULL,
    "assignmentType" "DisciplineAssignmentType" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDisciplineAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTypeCategory" (
    "id" TEXT NOT NULL,
    "scopeLevel" "ScopeLevel" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTypeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleasePurpose" (
    "id" TEXT NOT NULL,
    "scopeLevel" "ScopeLevel" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleasePurpose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCode" (
    "id" TEXT NOT NULL,
    "scopeLevel" "ScopeLevel" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "requiresResubmittal" BOOLEAN NOT NULL DEFAULT false,
    "finalizesDocument" BOOLEAN NOT NULL DEFAULT false,
    "informationalOnly" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberingRule" (
    "id" TEXT NOT NULL,
    "scopeLevel" "ScopeLevel" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formatString" TEXT NOT NULL,
    "sequenceScope" "NumberingSequenceScope" NOT NULL,
    "padding" INTEGER NOT NULL DEFAULT 4,
    "separator" TEXT NOT NULL DEFAULT '-',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberingRuleToken" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "tokenType" "NumberingTokenType" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "valueTemplate" TEXT,
    "padding" INTEGER,
    "separator" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberingRuleToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberingSequence" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberingSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdiRegister" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Project Document Index',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdiRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdiItem" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "documentTypeCategoryId" TEXT,
    "releasePurposeId" TEXT,
    "numberingRuleId" TEXT,
    "dtgsaDocumentNumber" TEXT NOT NULL,
    "clientDocumentNumber" TEXT,
    "title" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "revision" TEXT NOT NULL DEFAULT '00',
    "status" "PdiStatus" NOT NULL DEFAULT 'Draft',
    "remarks" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PdiItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MdrDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "disciplineId" TEXT NOT NULL,
    "documentTypeCategoryId" TEXT,
    "releasePurposeId" TEXT,
    "sourcePdiItemId" TEXT,
    "dtgsaDocumentNumber" TEXT NOT NULL,
    "clientDocumentNumber" TEXT,
    "title" TEXT NOT NULL,
    "remarks" TEXT,
    "currentWorkflowStatus" "WorkflowStatus" NOT NULL DEFAULT 'Draft',
    "currentClientReplyState" "ClientReplyState" NOT NULL DEFAULT 'WaitingClientReply',
    "currentReviewCodeId" TEXT,
    "currentRevisionId" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MdrDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRevision" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "revisionLabel" TEXT NOT NULL,
    "revisionIndex" INTEGER NOT NULL,
    "workflowStatus" "WorkflowStatus" NOT NULL DEFAULT 'Draft',
    "revisionStatus" "RevisionStatus" NOT NULL DEFAULT 'Original',
    "clientReplyState" "ClientReplyState" NOT NULL DEFAULT 'WaitingClientReply',
    "reviewCodeId" TEXT,
    "parentRevisionId" TEXT,
    "sourceClientReplyId" TEXT,
    "sourceClientResponseId" TEXT,
    "reasonForRevision" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "submittedToClientAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFile" (
    "id" TEXT NOT NULL,
    "documentRevisionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "DocumentFileType" NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "providerKey" TEXT NOT NULL,
    "checksum" TEXT,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "documentRevisionId" TEXT NOT NULL,
    "stepType" "WorkflowStepType" NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "status" "WorkflowStepStatus" NOT NULL DEFAULT 'Pending',
    "assignedUserId" TEXT,
    "actedByUserId" TEXT,
    "actedAt" TIMESTAMP(3),
    "comments" TEXT,
    "signatureEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAction" (
    "id" TEXT NOT NULL,
    "documentRevisionId" TEXT NOT NULL,
    "workflowStepId" TEXT,
    "actionType" "WorkflowActionType" NOT NULL,
    "actorUserId" TEXT,
    "fromStatus" "WorkflowStatus",
    "toStatus" "WorkflowStatus",
    "comments" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverSheetTemplate" (
    "id" TEXT NOT NULL,
    "kind" "CoverSheetKind" NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL,
    "providerKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "placeholderSchema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CoverSheetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransmittalTemplate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL,
    "providerKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "placeholderSchema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TransmittalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "documentRevisionId" TEXT,
    "transmittalId" TEXT,
    "clientReplyId" TEXT,
    "kind" "GeneratedDocumentKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL,
    "providerKey" TEXT NOT NULL,
    "generatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transmittal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "transmittalNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "purpose" TEXT,
    "fromText" TEXT,
    "toText" TEXT,
    "ccText" TEXT,
    "attention" TEXT,
    "messageBody" TEXT,
    "respondByDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalAttachmentBytes" INTEGER NOT NULL DEFAULT 0,
    "status" "TransmittalStatus" NOT NULL DEFAULT 'Draft',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transmittal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransmittalItem" (
    "id" TEXT NOT NULL,
    "transmittalId" TEXT NOT NULL,
    "documentRevisionId" TEXT NOT NULL,
    "documentFileId" TEXT,
    "itemOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransmittalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientReply" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentRevisionId" TEXT,
    "transmittalId" TEXT,
    "reviewCodeId" TEXT NOT NULL,
    "replyState" "ClientReplyState" NOT NULL DEFAULT 'ReplyReceived',
    "nextAction" "ClientReplyNextAction" NOT NULL,
    "replyDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,
    "driveTargetFolderType" "DriveFolderType",
    "driveFileName" TEXT,
    "driveFileId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClientReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveMapping" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "folderType" "DriveFolderType" NOT NULL,
    "folderId" TEXT NOT NULL,
    "folderName" TEXT,
    "parentFolderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'Pending',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "metadata" JSONB,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'Info',
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "correlationId" TEXT,
    "previousAuditHash" TEXT,
    "currentAuditHash" TEXT,
    "actorSnapshot" JSONB,
    "relevantHashes" JSONB,
    "auditStream" TEXT,
    "auditSequence" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditCheckpoint" (
    "id" TEXT NOT NULL,
    "auditStream" TEXT NOT NULL,
    "sequence" BIGINT NOT NULL,
    "currentHash" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditCheckpoint_pkey" PRIMARY KEY ("id")
);

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
    "projectId" TEXT,
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
    "internalSessionId" TEXT,
    "provider" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "authenticatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sessionHash" TEXT,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RecentAuthenticationEvidence_pkey" PRIMARY KEY ("id")
);

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
    "metadataSnapshot" JSONB,
    "permissionsHash" TEXT,
    "trashed" BOOLEAN NOT NULL DEFAULT false,
    "lastReconciledAt" TIMESTAMP(3),

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
    "sourceDriveId" TEXT,
    "sourceFileId" TEXT,
    "copyJobId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "approvalLockedAt" TIMESTAMP(3),
    "opaqueFileName" TEXT,

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
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "attachmentKind" TEXT,
    "originalFileName" TEXT,
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
    "sourceManifestId" TEXT,
    "assemblyProfile" JSONB,
    "pdfEngineVersion" TEXT,
    "artifactSha256" TEXT,
    "sizeBytes" BIGINT,
    "requesterUserId" TEXT,
    "cleanupStatus" TEXT NOT NULL DEFAULT 'Pending',
    "cleanedAt" TIMESTAMP(3),
    "packageHash" TEXT,
    "cacheKey" TEXT,
    "authorizationScope" JSONB,
    "bytesProcessed" BIGINT,
    "assemblyDurationMs" INTEGER,

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
    "displayName" TEXT,
    "routeTemplate" JSONB,
    "changedByUserId" TEXT,

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
    "uploadKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "expectedHash" TEXT,
    "receivedBytes" BIGINT NOT NULL DEFAULT 0,
    "fileObjectId" TEXT,
    "idempotencyKey" TEXT NOT NULL,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

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
    "policyDigest" TEXT,
    "supersededAt" TIMESTAMP(3),

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
    "label" TEXT,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
    "commentRequired" BOOLEAN NOT NULL DEFAULT false,
    "dcValidation" BOOLEAN NOT NULL DEFAULT false,
    "allowAssigneePool" BOOLEAN NOT NULL DEFAULT false,
    "fallbackAssignment" JSONB,
    "escalationPolicy" JSONB,
    "returnTargets" JSONB,
    "rejectionBehavior" TEXT,

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
    "packageHash" TEXT,

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
    "parallelGroupId" TEXT,
    "policySnapshot" JSONB,

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
    "invalidatedAt" TIMESTAMP(3),
    "invalidationReason" TEXT,
    "sourceSystem" TEXT NOT NULL DEFAULT 'DOCUMENT_CONTROL',
    "sourceEntityType" TEXT NOT NULL DEFAULT 'DOCUMENT_REVISION',
    "sourceRecordId" TEXT,
    "sourceCallback" TEXT,
    "sourceMetadata" JSONB,
    "purpose" TEXT NOT NULL DEFAULT 'Document approval',
    "classification" TEXT NOT NULL DEFAULT 'INTERNAL',

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
    "stepOrder" INTEGER NOT NULL DEFAULT 0,
    "parallelGroupId" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "quorum" INTEGER NOT NULL DEFAULT 1,
    "policySnapshot" JSONB,

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
    "reassignmentRequiredAt" TIMESTAMP(3),
    "reassignmentReason" TEXT,

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
    "approvalEvidenceId" TEXT,
    "resultHash" TEXT,

    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSession" (
    "id" TEXT NOT NULL,
    "stepInstanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstOpenedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "approximateActiveSeconds" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "packageHash" TEXT,
    "declarationAcceptedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewPageEvent" (
    "id" TEXT NOT NULL,
    "reviewSessionId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewPageEvent_pkey" PRIMARY KEY ("id")
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
    "schemaVersion" TEXT NOT NULL DEFAULT '1',
    "customWidthPt" DECIMAL(65,30),
    "customHeightPt" DECIMAL(65,30),
    "contentHash" TEXT,
    "snapshot" JSONB,
    "supersededAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "legacyFallback" BOOLEAN NOT NULL DEFAULT true,

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
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,

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
    "roleLabel" TEXT,
    "specificAssignment" TEXT,
    "displayOptions" JSONB,

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
    "outputHash" TEXT,
    "rendererVersion" TEXT,
    "templateSnapshot" JSONB,

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverTemplateInheritanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageManifest" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "canonicalizationVersion" TEXT NOT NULL,
    "manifestJson" JSONB NOT NULL,
    "canonicalBytes" BYTEA,
    "manifestDigest" TEXT,
    "packageVersion" INTEGER NOT NULL DEFAULT 1,
    "invalidatedAt" TIMESTAMP(3),
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
    "evidenceVersion" TEXT NOT NULL DEFAULT '1',
    "canonicalPayload" BYTEA,
    "googleSubjectId" TEXT,
    "employeeSnapshot" JSONB,
    "workflowSnapshot" JSONB,
    "approvalCycleId" TEXT,
    "decision" TEXT,
    "declarationHash" TEXT,
    "recentAuthEvidenceId" TEXT,
    "requestMetadata" JSONB,
    "signatureAppearanceVersionId" TEXT,
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
    "publicKeyReference" TEXT,
    "signedPayloadVersion" TEXT NOT NULL DEFAULT '1',
    "verificationStatus" TEXT NOT NULL DEFAULT 'Pending',
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
    "timestampType" TEXT NOT NULL DEFAULT 'PLATFORM_UTC',
    "authenticatedDatabaseTime" TIMESTAMP(3),

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
    "targetType" TEXT NOT NULL DEFAULT 'PACKAGE_MANIFEST',
    "targetId" TEXT,
    "publicLabel" TEXT,
    "sealTransactionId" TEXT,
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "ClientResponseCodeSet" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdByUserId" TEXT,
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
    "validatedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "supersededAt" TIMESTAMP(3),
    "validationResult" JSONB,
    "snapshotHash" TEXT,

    CONSTRAINT "ClientResponseCodeSetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "configuredByUserId" TEXT,
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
    "submissionId" TEXT,
    "policySnapshotId" TEXT NOT NULL,
    "responseCodeId" TEXT NOT NULL,
    "externalCodeSnapshot" TEXT,
    "labelSnapshot" TEXT,
    "outcomeClass" "ClientResponseOutcomeClass" NOT NULL DEFAULT 'CUSTOM',
    "effectsSnapshot" JSONB,
    "incomingReference" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientReviewerName" TEXT,
    "clientReviewerDate" TIMESTAMP(3),
    "comments" TEXT,
    "primaryFileObjectId" TEXT,
    "primaryFileKind" "ClientResponseFileKind",
    "createdByUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "supersededAt" TIMESTAMP(3),
    "triggeredRevisionId" TEXT,

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
    "submittedMainFileObjectId" TEXT,
    "packageHash" TEXT,
    "submissionNumber" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "packageManifestId" TEXT,
    "authorUserId" TEXT,
    "authorIntegrationClientId" TEXT,
    "parentCommentId" TEXT,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "state" "CommentState" NOT NULL DEFAULT 'Open',
    "responsibleDepartmentId" TEXT,
    "closureVerifiedByUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
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
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "lastError" JSONB,
    "deadLetteredAt" TIMESTAMP(3),
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
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "idempotencyKey" TEXT NOT NULL,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "progressMessage" TEXT,
    "cancelRequestedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "lastError" JSONB,
    "metrics" JSONB,
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
    "leaseOwner" TEXT,
    "heartbeatAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "retryAt" TIMESTAMP(3),
    "outcome" TEXT,
    "error" JSONB,

    CONSTRAINT "JobAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "targetHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'Pending',
    "attemptedAt" TIMESTAMP(3),
    "responseMetadata" JSONB,
    "providerMessageId" TEXT,
    "completedAt" TIMESTAMP(3),
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
    "statusCode" INTEGER NOT NULL DEFAULT 200,
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
    "projectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 120,
    "lastUsedAt" TIMESTAMP(3),
    "secretRotatedAt" TIMESTAMP(3),
    "credentialMetadata" JSONB,

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

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "integrationClientId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "eventTypes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousSecretHash" TEXT,
    "secretRotatedAt" TIMESTAMP(3),
    "encryptedSecret" TEXT,
    "secretKeyVersion" INTEGER NOT NULL DEFAULT 1,

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
    "responseMetadata" JSONB,
    "signatureVersion" INTEGER NOT NULL DEFAULT 1,
    "lastError" JSONB,
    "completedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralRequestType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentOwner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneralRequestType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralRequestApprovalCase" (
    "id" TEXT NOT NULL,
    "generalRequestId" TEXT NOT NULL,
    "packageHash" TEXT NOT NULL,
    "workflowSnapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GeneralRequestApprovalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralRequestApprovalStep" (
    "id" TEXT NOT NULL,
    "approvalCaseId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "requiredRole" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GeneralRequestApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralRequestApprovalDecision" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comments" TEXT,
    "declarationHash" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "identitySnapshot" JSONB NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneralRequestApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralRequestAttachment" (
    "id" TEXT NOT NULL,
    "generalRequestId" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneralRequestAttachment_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "projectId" TEXT,
    "clientId" TEXT,
    "severity" "SystemSeverity" NOT NULL DEFAULT 'Info',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_group_idx" ON "SystemSetting"("group");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_group_idx" ON "Permission"("group");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "UserProjectRole_projectId_roleId_idx" ON "UserProjectRole"("projectId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProjectRole_userId_projectId_roleId_key" ON "UserProjectRole"("userId", "projectId", "roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureProfile_userId_key" ON "SignatureProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureEvent_auditLogId_key" ON "SignatureEvent"("auditLogId");

-- CreateIndex
CREATE INDEX "SignatureEvent_targetEntityType_targetEntityId_idx" ON "SignatureEvent"("targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "SignatureEvent_signedAt_idx" ON "SignatureEvent"("signedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_code_key" ON "Client"("code");

-- CreateIndex
CREATE INDEX "Client_isActive_idx" ON "Client"("isActive");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_isPrimary_idx" ON "ClientContact"("clientId", "isPrimary");

-- CreateIndex
CREATE INDEX "ClientContact_email_idx" ON "ClientContact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSetting_clientId_key" ON "ClientSetting"("clientId");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Project_isActive_idx" ON "Project"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Project_clientId_code_key" ON "Project"("clientId", "code");

-- CreateIndex
CREATE INDEX "ProjectContact_projectId_isPrimary_idx" ON "ProjectContact"("projectId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSetting_projectId_key" ON "ProjectSetting"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Discipline_code_key" ON "Discipline"("code");

-- CreateIndex
CREATE INDEX "Discipline_name_idx" ON "Discipline"("name");

-- CreateIndex
CREATE INDEX "ClientDiscipline_clientId_isActive_idx" ON "ClientDiscipline"("clientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClientDiscipline_clientId_disciplineId_key" ON "ClientDiscipline"("clientId", "disciplineId");

-- CreateIndex
CREATE INDEX "ProjectDiscipline_projectId_isActive_idx" ON "ProjectDiscipline"("projectId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDiscipline_projectId_disciplineId_key" ON "ProjectDiscipline"("projectId", "disciplineId");

-- CreateIndex
CREATE INDEX "ProjectDisciplineAssignment_userId_idx" ON "ProjectDisciplineAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDisciplineAssignment_projectDisciplineId_assignmentT_key" ON "ProjectDisciplineAssignment"("projectDisciplineId", "assignmentType");

-- CreateIndex
CREATE INDEX "DocumentTypeCategory_clientId_idx" ON "DocumentTypeCategory"("clientId");

-- CreateIndex
CREATE INDEX "DocumentTypeCategory_projectId_idx" ON "DocumentTypeCategory"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTypeCategory_scopeLevel_scopeKey_code_key" ON "DocumentTypeCategory"("scopeLevel", "scopeKey", "code");

-- CreateIndex
CREATE INDEX "ReleasePurpose_clientId_idx" ON "ReleasePurpose"("clientId");

-- CreateIndex
CREATE INDEX "ReleasePurpose_projectId_idx" ON "ReleasePurpose"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleasePurpose_scopeLevel_scopeKey_code_key" ON "ReleasePurpose"("scopeLevel", "scopeKey", "code");

-- CreateIndex
CREATE INDEX "ReviewCode_clientId_idx" ON "ReviewCode"("clientId");

-- CreateIndex
CREATE INDEX "ReviewCode_projectId_idx" ON "ReviewCode"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCode_scopeLevel_scopeKey_code_key" ON "ReviewCode"("scopeLevel", "scopeKey", "code");

-- CreateIndex
CREATE INDEX "NumberingRule_clientId_idx" ON "NumberingRule"("clientId");

-- CreateIndex
CREATE INDEX "NumberingRule_projectId_idx" ON "NumberingRule"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "NumberingRule_scopeLevel_scopeKey_name_key" ON "NumberingRule"("scopeLevel", "scopeKey", "name");

-- CreateIndex
CREATE UNIQUE INDEX "NumberingRuleToken_ruleId_order_key" ON "NumberingRuleToken"("ruleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "NumberingSequence_ruleId_scopeKey_key" ON "NumberingSequence"("ruleId", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "PdiRegister_projectId_key" ON "PdiRegister"("projectId");

-- CreateIndex
CREATE INDEX "PdiItem_projectId_status_idx" ON "PdiItem"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PdiItem_projectId_dtgsaDocumentNumber_key" ON "PdiItem"("projectId", "dtgsaDocumentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MdrDocument_sourcePdiItemId_key" ON "MdrDocument"("sourcePdiItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MdrDocument_currentRevisionId_key" ON "MdrDocument"("currentRevisionId");

-- CreateIndex
CREATE INDEX "MdrDocument_projectId_currentWorkflowStatus_idx" ON "MdrDocument"("projectId", "currentWorkflowStatus");

-- CreateIndex
CREATE INDEX "MdrDocument_projectId_currentClientReplyState_idx" ON "MdrDocument"("projectId", "currentClientReplyState");

-- CreateIndex
CREATE UNIQUE INDEX "MdrDocument_projectId_dtgsaDocumentNumber_key" ON "MdrDocument"("projectId", "dtgsaDocumentNumber");

-- CreateIndex
CREATE INDEX "DocumentRevision_documentId_isCurrent_idx" ON "DocumentRevision"("documentId", "isCurrent");

-- CreateIndex
CREATE INDEX "DocumentRevision_workflowStatus_revisionStatus_idx" ON "DocumentRevision"("workflowStatus", "revisionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRevision_documentId_revisionLabel_key" ON "DocumentRevision"("documentId", "revisionLabel");

-- CreateIndex
CREATE INDEX "DocumentFile_documentRevisionId_type_idx" ON "DocumentFile"("documentRevisionId", "type");

-- CreateIndex
CREATE INDEX "DocumentFile_projectId_type_idx" ON "DocumentFile"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_signatureEventId_key" ON "WorkflowStep"("signatureEventId");

-- CreateIndex
CREATE INDEX "WorkflowStep_assignedUserId_status_idx" ON "WorkflowStep"("assignedUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_documentRevisionId_stepType_key" ON "WorkflowStep"("documentRevisionId", "stepType");

-- CreateIndex
CREATE INDEX "WorkflowAction_documentRevisionId_createdAt_idx" ON "WorkflowAction"("documentRevisionId", "createdAt");

-- CreateIndex
CREATE INDEX "CoverSheetTemplate_clientId_kind_isActive_idx" ON "CoverSheetTemplate"("clientId", "kind", "isActive");

-- CreateIndex
CREATE INDEX "CoverSheetTemplate_projectId_kind_isActive_idx" ON "CoverSheetTemplate"("projectId", "kind", "isActive");

-- CreateIndex
CREATE INDEX "TransmittalTemplate_clientId_isActive_idx" ON "TransmittalTemplate"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "TransmittalTemplate_projectId_isActive_idx" ON "TransmittalTemplate"("projectId", "isActive");

-- CreateIndex
CREATE INDEX "GeneratedDocument_documentRevisionId_kind_idx" ON "GeneratedDocument"("documentRevisionId", "kind");

-- CreateIndex
CREATE INDEX "GeneratedDocument_transmittalId_kind_idx" ON "GeneratedDocument"("transmittalId", "kind");

-- CreateIndex
CREATE INDEX "GeneratedDocument_clientReplyId_kind_idx" ON "GeneratedDocument"("clientReplyId", "kind");

-- CreateIndex
CREATE INDEX "Transmittal_projectId_status_idx" ON "Transmittal"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Transmittal_projectId_transmittalNumber_key" ON "Transmittal"("projectId", "transmittalNumber");

-- CreateIndex
CREATE INDEX "TransmittalItem_documentFileId_idx" ON "TransmittalItem"("documentFileId");

-- CreateIndex
CREATE UNIQUE INDEX "TransmittalItem_transmittalId_documentRevisionId_key" ON "TransmittalItem"("transmittalId", "documentRevisionId");

-- CreateIndex
CREATE INDEX "ClientReply_projectId_replyDate_idx" ON "ClientReply"("projectId", "replyDate");

-- CreateIndex
CREATE INDEX "ClientReply_documentId_replyDate_idx" ON "ClientReply"("documentId", "replyDate");

-- CreateIndex
CREATE UNIQUE INDEX "DriveMapping_projectId_folderType_key" ON "DriveMapping"("projectId", "folderType");

-- CreateIndex
CREATE UNIQUE INDEX "DriveMapping_projectId_folderId_key" ON "DriveMapping"("projectId", "folderId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_projectId_idx" ON "Notification"("projectId");

-- CreateIndex
CREATE INDEX "Notification_clientId_idx" ON "Notification"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_currentAuditHash_key" ON "AuditLog"("currentAuditHash");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_projectId_createdAt_idx" ON "AuditLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_clientId_createdAt_idx" ON "AuditLog"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_auditStream_auditSequence_key" ON "AuditLog"("auditStream", "auditSequence");

-- CreateIndex
CREATE UNIQUE INDEX "AuditCheckpoint_auditStream_sequence_key" ON "AuditCheckpoint"("auditStream", "sequence");

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
CREATE INDEX "RecentAuthenticationEvidence_internalSessionId_expiresAt_idx" ON "RecentAuthenticationEvidence"("internalSessionId", "expiresAt");

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
CREATE UNIQUE INDEX "ControlledMainFile_copyJobId_key" ON "ControlledMainFile"("copyJobId");

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
CREATE UNIQUE INDEX "GeneratedArtifactRecord_cacheKey_key" ON "GeneratedArtifactRecord"("cacheKey");

-- CreateIndex
CREATE INDEX "GeneratedArtifactRecord_revisionId_artifactKind_expiresAt_idx" ON "GeneratedArtifactRecord"("revisionId", "artifactKind", "expiresAt");

-- CreateIndex
CREATE INDEX "GeneratedArtifactRecord_cleanupStatus_expiresAt_idx" ON "GeneratedArtifactRecord"("cleanupStatus", "expiresAt");

-- CreateIndex
CREATE INDEX "FileIntegrityCheck_fileObjectId_checkedAt_idx" ON "FileIntegrityCheck"("fileObjectId", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StorageFolderRule_scopeType_scopeId_folderKind_version_key" ON "StorageFolderRule"("scopeType", "scopeId", "folderKind", "version");

-- CreateIndex
CREATE UNIQUE INDEX "UploadSession_uploadKey_key" ON "UploadSession"("uploadKey");

-- CreateIndex
CREATE UNIQUE INDEX "UploadSession_idempotencyKey_key" ON "UploadSession"("idempotencyKey");

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
CREATE UNIQUE INDEX "ApprovalDecision_approvalEvidenceId_key" ON "ApprovalDecision"("approvalEvidenceId");

-- CreateIndex
CREATE INDEX "ApprovalDecision_stepInstanceId_decidedAt_idx" ON "ApprovalDecision"("stepInstanceId", "decidedAt");

-- CreateIndex
CREATE INDEX "ReviewSession_stepInstanceId_userId_idx" ON "ReviewSession"("stepInstanceId", "userId");

-- CreateIndex
CREATE INDEX "ReviewSession_userId_expiresAt_revokedAt_idx" ON "ReviewSession"("userId", "expiresAt", "revokedAt");

-- CreateIndex
CREATE INDEX "ReviewPageEvent_reviewSessionId_occurredAt_idx" ON "ReviewPageEvent"("reviewSessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReviewPageEvent_reviewSessionId_pageNumber_idx" ON "ReviewPageEvent"("reviewSessionId", "pageNumber");

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
CREATE INDEX "VerificationCode_targetType_targetId_idx" ON "VerificationCode"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicVerificationPolicy_projectId_version_key" ON "PublicVerificationPolicy"("projectId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SigningKeyRegistry_keyId_key" ON "SigningKeyRegistry"("keyId");

-- CreateIndex
CREATE INDEX "VerificationAttempt_requestFingerprintHash_createdAt_idx" ON "VerificationAttempt"("requestFingerprintHash", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationAttempt_codeHash_createdAt_idx" ON "VerificationAttempt"("codeHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseCodeSet_clientId_code_key" ON "ClientResponseCodeSet"("clientId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseCodeSetVersion_snapshotHash_key" ON "ClientResponseCodeSetVersion"("snapshotHash");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseCodeSetVersion_codeSetId_version_key" ON "ClientResponseCodeSetVersion"("codeSetId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseCodeReference_codeSetId_fileObjectId_key" ON "ClientResponseCodeReference"("codeSetId", "fileObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseCode_versionId_externalCode_key" ON "ClientResponseCode"("versionId", "externalCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectResponseCodeConfiguration_projectId_key" ON "ProjectResponseCodeConfiguration"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponsePolicySnapshot_snapshotHash_key" ON "ClientResponsePolicySnapshot"("snapshotHash");

-- CreateIndex
CREATE INDEX "ClientResponse_revisionId_receivedAt_idx" ON "ClientResponse"("revisionId", "receivedAt");

-- CreateIndex
CREATE INDEX "ClientResponse_submissionId_receivedAt_idx" ON "ClientResponse"("submissionId", "receivedAt");

-- CreateIndex
CREATE INDEX "ClientResponse_outcomeClass_receivedAt_idx" ON "ClientResponse"("outcomeClass", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientResponseAttachment_clientResponseId_fileObjectId_key" ON "ClientResponseAttachment"("clientResponseId", "fileObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSubmission_revisionId_submissionNumber_key" ON "ClientSubmission"("revisionId", "submissionNumber");

-- CreateIndex
CREATE INDEX "Comment_revisionId_state_idx" ON "Comment"("revisionId", "state");

-- CreateIndex
CREATE INDEX "Comment_parentCommentId_createdAt_idx" ON "Comment"("parentCommentId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_responsibleDepartmentId_state_idx" ON "Comment"("responsibleDepartmentId", "state");

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
CREATE UNIQUE INDEX "BackgroundJob_idempotencyKey_key" ON "BackgroundJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BackgroundJob_state_nextAttemptAt_priority_idx" ON "BackgroundJob"("state", "nextAttemptAt", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "JobAttempt_jobId_attemptNumber_key" ON "JobAttempt"("jobId", "attemptNumber");

-- CreateIndex
CREATE INDEX "JobArtifact_jobId_createdAt_idx" ON "JobArtifact"("jobId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobArtifact_jobId_artifactId_key" ON "JobArtifact"("jobId", "artifactId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAttempt_idempotencyKey_key" ON "DeliveryAttempt"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_clientId_scope_key_key" ON "IdempotencyRecord"("clientId", "scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationClient_clientKey_key" ON "IntegrationClient"("clientKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationScope_integrationClientId_scope_key" ON "IntegrationScope"("integrationClientId", "scope");

-- CreateIndex
CREATE INDEX "IntegrationRequestAttempt_integrationClientId_createdAt_idx" ON "IntegrationRequestAttempt"("integrationClientId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationRequestAttempt_correlationId_idx" ON "IntegrationRequestAttempt"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_endpointId_outboxEventId_key" ON "WebhookDelivery"("endpointId", "outboxEventId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralRequestType_code_key" ON "GeneralRequestType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralRequestTypeVersion_requestTypeId_version_key" ON "GeneralRequestTypeVersion"("requestTypeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralRequest_requestNumber_key" ON "GeneralRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "GeneralRequest_sourceSystem_sourceEntityType_sourceRecordId_idx" ON "GeneralRequest"("sourceSystem", "sourceEntityType", "sourceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralRequestApprovalCase_generalRequestId_key" ON "GeneralRequestApprovalCase"("generalRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralRequestApprovalStep_approvalCaseId_stepKey_key" ON "GeneralRequestApprovalStep"("approvalCaseId", "stepKey");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralRequestApprovalDecision_evidenceHash_key" ON "GeneralRequestApprovalDecision"("evidenceHash");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralRequestApprovalDecision_idempotencyKey_key" ON "GeneralRequestApprovalDecision"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralRequestAttachment_generalRequestId_fileObjectId_key" ON "GeneralRequestAttachment"("generalRequestId", "fileObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionRule_recordClass_version_key" ON "RetentionRule"("recordClass", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationVersion_scope_scopeId_version_key" ON "ConfigurationVersion"("scope", "scopeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AuditIntegrityCheckpoint_checkpointHash_key" ON "AuditIntegrityCheckpoint"("checkpointHash");

-- CreateIndex
CREATE INDEX "SystemLog_source_createdAt_idx" ON "SystemLog"("source", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_projectId_createdAt_idx" ON "SystemLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_clientId_createdAt_idx" ON "SystemLog"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectRole" ADD CONSTRAINT "UserProjectRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectRole" ADD CONSTRAINT "UserProjectRole_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectRole" ADD CONSTRAINT "UserProjectRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureProfile" ADD CONSTRAINT "SignatureProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureEvent" ADD CONSTRAINT "SignatureEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureEvent" ADD CONSTRAINT "SignatureEvent_signatureProfileId_fkey" FOREIGN KEY ("signatureProfileId") REFERENCES "SignatureProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureEvent" ADD CONSTRAINT "SignatureEvent_auditLogId_fkey" FOREIGN KEY ("auditLogId") REFERENCES "AuditLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSetting" ADD CONSTRAINT "ClientSetting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContact" ADD CONSTRAINT "ProjectContact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSetting" ADD CONSTRAINT "ProjectSetting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDiscipline" ADD CONSTRAINT "ClientDiscipline_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDiscipline" ADD CONSTRAINT "ClientDiscipline_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDiscipline" ADD CONSTRAINT "ProjectDiscipline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDiscipline" ADD CONSTRAINT "ProjectDiscipline_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDiscipline" ADD CONSTRAINT "ProjectDiscipline_clientDisciplineId_fkey" FOREIGN KEY ("clientDisciplineId") REFERENCES "ClientDiscipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDisciplineAssignment" ADD CONSTRAINT "ProjectDisciplineAssignment_projectDisciplineId_fkey" FOREIGN KEY ("projectDisciplineId") REFERENCES "ProjectDiscipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDisciplineAssignment" ADD CONSTRAINT "ProjectDisciplineAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTypeCategory" ADD CONSTRAINT "DocumentTypeCategory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTypeCategory" ADD CONSTRAINT "DocumentTypeCategory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleasePurpose" ADD CONSTRAINT "ReleasePurpose_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleasePurpose" ADD CONSTRAINT "ReleasePurpose_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCode" ADD CONSTRAINT "ReviewCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCode" ADD CONSTRAINT "ReviewCode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumberingRule" ADD CONSTRAINT "NumberingRule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumberingRule" ADD CONSTRAINT "NumberingRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumberingRuleToken" ADD CONSTRAINT "NumberingRuleToken_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NumberingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NumberingSequence" ADD CONSTRAINT "NumberingSequence_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "NumberingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdiRegister" ADD CONSTRAINT "PdiRegister_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdiItem" ADD CONSTRAINT "PdiItem_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "PdiRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdiItem" ADD CONSTRAINT "PdiItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdiItem" ADD CONSTRAINT "PdiItem_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdiItem" ADD CONSTRAINT "PdiItem_documentTypeCategoryId_fkey" FOREIGN KEY ("documentTypeCategoryId") REFERENCES "DocumentTypeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdiItem" ADD CONSTRAINT "PdiItem_releasePurposeId_fkey" FOREIGN KEY ("releasePurposeId") REFERENCES "ReleasePurpose"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdiItem" ADD CONSTRAINT "PdiItem_numberingRuleId_fkey" FOREIGN KEY ("numberingRuleId") REFERENCES "NumberingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MdrDocument" ADD CONSTRAINT "MdrDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MdrDocument" ADD CONSTRAINT "MdrDocument_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MdrDocument" ADD CONSTRAINT "MdrDocument_documentTypeCategoryId_fkey" FOREIGN KEY ("documentTypeCategoryId") REFERENCES "DocumentTypeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MdrDocument" ADD CONSTRAINT "MdrDocument_releasePurposeId_fkey" FOREIGN KEY ("releasePurposeId") REFERENCES "ReleasePurpose"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MdrDocument" ADD CONSTRAINT "MdrDocument_sourcePdiItemId_fkey" FOREIGN KEY ("sourcePdiItemId") REFERENCES "PdiItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MdrDocument" ADD CONSTRAINT "MdrDocument_currentReviewCodeId_fkey" FOREIGN KEY ("currentReviewCodeId") REFERENCES "ReviewCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MdrDocument" ADD CONSTRAINT "MdrDocument_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "DocumentRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "MdrDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_reviewCodeId_fkey" FOREIGN KEY ("reviewCodeId") REFERENCES "ReviewCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_parentRevisionId_fkey" FOREIGN KEY ("parentRevisionId") REFERENCES "DocumentRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_sourceClientReplyId_fkey" FOREIGN KEY ("sourceClientReplyId") REFERENCES "ClientReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_documentRevisionId_fkey" FOREIGN KEY ("documentRevisionId") REFERENCES "DocumentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_documentRevisionId_fkey" FOREIGN KEY ("documentRevisionId") REFERENCES "DocumentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_signatureEventId_fkey" FOREIGN KEY ("signatureEventId") REFERENCES "SignatureEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_documentRevisionId_fkey" FOREIGN KEY ("documentRevisionId") REFERENCES "DocumentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverSheetTemplate" ADD CONSTRAINT "CoverSheetTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoverSheetTemplate" ADD CONSTRAINT "CoverSheetTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransmittalTemplate" ADD CONSTRAINT "TransmittalTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransmittalTemplate" ADD CONSTRAINT "TransmittalTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_documentRevisionId_fkey" FOREIGN KEY ("documentRevisionId") REFERENCES "DocumentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_transmittalId_fkey" FOREIGN KEY ("transmittalId") REFERENCES "Transmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_clientReplyId_fkey" FOREIGN KEY ("clientReplyId") REFERENCES "ClientReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transmittal" ADD CONSTRAINT "Transmittal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransmittalItem" ADD CONSTRAINT "TransmittalItem_transmittalId_fkey" FOREIGN KEY ("transmittalId") REFERENCES "Transmittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransmittalItem" ADD CONSTRAINT "TransmittalItem_documentRevisionId_fkey" FOREIGN KEY ("documentRevisionId") REFERENCES "DocumentRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransmittalItem" ADD CONSTRAINT "TransmittalItem_documentFileId_fkey" FOREIGN KEY ("documentFileId") REFERENCES "DocumentFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReply" ADD CONSTRAINT "ClientReply_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReply" ADD CONSTRAINT "ClientReply_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "MdrDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReply" ADD CONSTRAINT "ClientReply_documentRevisionId_fkey" FOREIGN KEY ("documentRevisionId") REFERENCES "DocumentRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReply" ADD CONSTRAINT "ClientReply_transmittalId_fkey" FOREIGN KEY ("transmittalId") REFERENCES "Transmittal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReply" ADD CONSTRAINT "ClientReply_reviewCodeId_fkey" FOREIGN KEY ("reviewCodeId") REFERENCES "ReviewCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveMapping" ADD CONSTRAINT "DriveMapping_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "DriveFileIdentity" ADD CONSTRAINT "DriveFileIdentity_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledMainFile" ADD CONSTRAINT "ControlledMainFile_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DocumentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledMainFile" ADD CONSTRAINT "ControlledMainFile_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledAttachment" ADD CONSTRAINT "ControlledAttachment_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileIntegrityCheck" ADD CONSTRAINT "FileIntegrityCheck_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadSessionPart" ADD CONSTRAINT "UploadSessionPart_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledStorageIssue" ADD CONSTRAINT "ControlledStorageIssue_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "ReconciliationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlledStorageIssue" ADD CONSTRAINT "ControlledStorageIssue_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDefinitionVersion" ADD CONSTRAINT "WorkflowDefinitionVersion_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDefinitionStep" ADD CONSTRAINT "WorkflowDefinitionStep_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "WorkflowDefinitionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSnapshot" ADD CONSTRAINT "WorkflowSnapshot_definitionVersionId_fkey" FOREIGN KEY ("definitionVersionId") REFERENCES "WorkflowDefinitionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowSnapshotStep" ADD CONSTRAINT "WorkflowSnapshotStep_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WorkflowSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalCycle" ADD CONSTRAINT "ApprovalCycle_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "DocumentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalCycle" ADD CONSTRAINT "ApprovalCycle_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WorkflowSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepInstance" ADD CONSTRAINT "WorkflowStepInstance_approvalCycleId_fkey" FOREIGN KEY ("approvalCycleId") REFERENCES "ApprovalCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewPageEvent" ADD CONSTRAINT "ReviewPageEvent_reviewSessionId_fkey" FOREIGN KEY ("reviewSessionId") REFERENCES "ReviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "GeneralRequestApprovalCase" ADD CONSTRAINT "GeneralRequestApprovalCase_generalRequestId_fkey" FOREIGN KEY ("generalRequestId") REFERENCES "GeneralRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralRequestApprovalStep" ADD CONSTRAINT "GeneralRequestApprovalStep_approvalCaseId_fkey" FOREIGN KEY ("approvalCaseId") REFERENCES "GeneralRequestApprovalCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralRequestApprovalDecision" ADD CONSTRAINT "GeneralRequestApprovalDecision_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "GeneralRequestApprovalStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralRequestAttachment" ADD CONSTRAINT "GeneralRequestAttachment_generalRequestId_fkey" FOREIGN KEY ("generalRequestId") REFERENCES "GeneralRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Database-enforced invariants preserved from the pre-production migration history.

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

CREATE OR REPLACE FUNCTION "prevent_audit_log_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION "prevent_group_mapping_version_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Google group mapping versions are append-only';
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION reject_phase6_evidence_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Phase 6 trust evidence is immutable';
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION "prevent_workflow_version_mutation"()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" IN ('Published', 'Superseded') THEN
    RAISE EXCEPTION 'Published version records are immutable';
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD."status" = 'Published'
     AND NEW."status" = 'Superseded'
     AND NEW."definitionId" = OLD."definitionId"
     AND NEW."version" = OLD."version"
     AND NEW."publishedAt" IS NOT DISTINCT FROM OLD."publishedAt"
     AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt"
     AND NEW."policyDigest" IS NOT DISTINCT FROM OLD."policyDigest"
     AND NEW."supersededAt" IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF OLD."status" IN ('Published', 'Superseded') AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Published version records are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "prevent_published_workflow_content_mutation"()
RETURNS trigger AS $$
DECLARE
  parent_version_id text;
  parent_status "FoundationRecordStatus";
BEGIN
  parent_version_id := COALESCE(NEW."versionId", OLD."versionId");
  SELECT "status" INTO parent_status
  FROM "WorkflowDefinitionVersion"
  WHERE "id" = parent_version_id;
  IF parent_status IN ('Published', 'Superseded') THEN
    RAISE EXCEPTION 'Published workflow content is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_workflow_snapshot_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Workflow snapshots and snapshot steps are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_approval_decision_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD."approvalEvidenceId" IS NULL
     AND NEW."approvalEvidenceId" IS NOT NULL
     AND NEW."id" = OLD."id"
     AND NEW."stepInstanceId" = OLD."stepInstanceId"
     AND NEW."actorUserId" = OLD."actorUserId"
     AND NEW."decision" = OLD."decision"
     AND NEW."expectedStateVersion" = OLD."expectedStateVersion"
     AND NEW."idempotencyKey" = OLD."idempotencyKey"
     AND NEW."comments" IS NOT DISTINCT FROM OLD."comments"
     AND NEW."decidedAt" = OLD."decidedAt"
     AND NEW."resultHash" IS NOT DISTINCT FROM OLD."resultHash" THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Approval decisions are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "prevent_cover_version_mutation"()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" IN ('Published', 'Superseded') THEN
    RAISE EXCEPTION 'Published version records are immutable';
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD."status" = 'Published'
     AND NEW."status" = 'Superseded'
     AND NEW."templateId" = OLD."templateId"
     AND NEW."version" = OLD."version"
     AND NEW."pageSize" = OLD."pageSize"
     AND NEW."orientation" = OLD."orientation"
     AND NEW."publishedAt" IS NOT DISTINCT FROM OLD."publishedAt"
     AND NEW."createdAt" = OLD."createdAt"
     AND NEW."schemaVersion" = OLD."schemaVersion"
     AND NEW."customWidthPt" IS NOT DISTINCT FROM OLD."customWidthPt"
     AND NEW."customHeightPt" IS NOT DISTINCT FROM OLD."customHeightPt"
     AND NEW."contentHash" IS NOT DISTINCT FROM OLD."contentHash"
     AND NEW."snapshot" IS NOT DISTINCT FROM OLD."snapshot"
     AND NEW."publishedByUserId" IS NOT DISTINCT FROM OLD."publishedByUserId"
     AND NEW."legacyFallback" = OLD."legacyFallback"
     AND NEW."supersededAt" IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD."status" = 'Superseded'
     AND NEW."status" = 'Archived'
     AND NEW."templateId" = OLD."templateId"
     AND NEW."version" = OLD."version"
     AND NEW."pageSize" = OLD."pageSize"
     AND NEW."orientation" = OLD."orientation"
     AND NEW."publishedAt" IS NOT DISTINCT FROM OLD."publishedAt"
     AND NEW."createdAt" = OLD."createdAt"
     AND NEW."schemaVersion" = OLD."schemaVersion"
     AND NEW."customWidthPt" IS NOT DISTINCT FROM OLD."customWidthPt"
     AND NEW."customHeightPt" IS NOT DISTINCT FROM OLD."customHeightPt"
     AND NEW."contentHash" IS NOT DISTINCT FROM OLD."contentHash"
     AND NEW."snapshot" IS NOT DISTINCT FROM OLD."snapshot"
     AND NEW."publishedByUserId" IS NOT DISTINCT FROM OLD."publishedByUserId"
     AND NEW."legacyFallback" = OLD."legacyFallback"
     AND NEW."supersededAt" IS NOT DISTINCT FROM OLD."supersededAt" THEN
    RETURN NEW;
  END IF;
  IF OLD."status" IN ('Published', 'Superseded', 'Archived')
     AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Published version records are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  IF parent_status IN ('Published', 'Superseded', 'Archived') THEN
    RAISE EXCEPTION 'Published cover content is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_review_page_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Review page events are append-only';
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION prevent_published_request_version_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'Published' THEN
    RAISE EXCEPTION 'Published general-request versions are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE UNIQUE INDEX "ApprovalCycle_one_active_per_revision"
ON "ApprovalCycle" ("revisionId")
WHERE "isActive" = true AND "completedAt" IS NULL;

CREATE TRIGGER "WorkflowDefinitionVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "WorkflowDefinitionVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_version_mutation"();

CREATE TRIGGER "CoverTemplateVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "CoverTemplateVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_version_mutation"();

CREATE TRIGGER "ClientResponseCodeSetVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "ClientResponseCodeSetVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_version_mutation"();

CREATE TRIGGER "AuditLog_append_only"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION "prevent_audit_log_mutation"();

CREATE TRIGGER "WorkflowDefinitionStep_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "WorkflowDefinitionStep"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_workflow_content_mutation"();

CREATE TRIGGER "WorkflowParallelGroup_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "WorkflowParallelGroup"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_workflow_content_mutation"();

CREATE TRIGGER "CoverLayoutElement_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "CoverLayoutElement"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_cover_content_mutation"();

CREATE TRIGGER "CoverFieldBinding_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "CoverFieldBinding"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_cover_content_mutation"();

CREATE TRIGGER "SignatureBox_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "SignatureBox"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_cover_content_mutation"();

CREATE TRIGGER "ClientResponseCode_published_content_immutable"
BEFORE INSERT OR UPDATE OR DELETE ON "ClientResponseCode"
FOR EACH ROW EXECUTE FUNCTION "prevent_published_response_code_mutation"();

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

CREATE TRIGGER "GoogleWorkspaceIdentity_subject_immutable"
BEFORE UPDATE ON "GoogleWorkspaceIdentity"
FOR EACH ROW EXECUTE FUNCTION "prevent_google_subject_mutation"();

CREATE TRIGGER "GoogleGroupMappingVersion_append_only"
BEFORE UPDATE OR DELETE ON "GoogleGroupMappingVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_group_mapping_version_mutation"();

ALTER TABLE "UploadSession"
ADD CONSTRAINT "UploadSession_valid_window"
CHECK ("expiresAt" > "createdAt" AND "receivedBytes" >= 0);

ALTER TABLE "UploadSessionPart"
ADD CONSTRAINT "UploadSessionPart_valid_part"
CHECK ("partNumber" >= 0 AND "offsetBytes" >= 0 AND "sizeBytes" > 0);

CREATE TRIGGER "ControlledMainFile_verified_identity_immutable"
BEFORE UPDATE ON "ControlledMainFile"
FOR EACH ROW EXECUTE FUNCTION "prevent_verified_controlled_file_mutation"();

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

CREATE TRIGGER "AuditLog_hashed_append_only"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION reject_hashed_audit_mutation();

DROP TRIGGER "WorkflowDefinitionVersion_published_immutable"
  ON "WorkflowDefinitionVersion";

CREATE TRIGGER "WorkflowDefinitionVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "WorkflowDefinitionVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_workflow_version_mutation"();

CREATE TRIGGER "WorkflowSnapshot_immutable"
BEFORE UPDATE OR DELETE ON "WorkflowSnapshot"
FOR EACH ROW EXECUTE FUNCTION reject_workflow_snapshot_mutation();

CREATE TRIGGER "WorkflowSnapshotStep_immutable"
BEFORE UPDATE OR DELETE ON "WorkflowSnapshotStep"
FOR EACH ROW EXECUTE FUNCTION reject_workflow_snapshot_mutation();

CREATE TRIGGER "ApprovalDecision_immutable"
BEFORE UPDATE OR DELETE ON "ApprovalDecision"
FOR EACH ROW EXECUTE FUNCTION reject_approval_decision_mutation();

ALTER TABLE "WorkflowDefinitionStep"
  ADD CONSTRAINT "WorkflowDefinitionStep_positive_quorum"
  CHECK ("quorum" > 0);

ALTER TABLE "WorkflowStepInstance"
  ADD CONSTRAINT "WorkflowStepInstance_positive_quorum"
  CHECK ("quorum" > 0);

ALTER TABLE "CoverLayoutElement"
  ADD CONSTRAINT "CoverLayoutElement_relative_bounds"
  CHECK (
    "x" >= 0 AND "y" >= 0 AND "width" > 0 AND "height" > 0
    AND "x" + "width" <= 1 AND "y" + "height" <= 1
  );

ALTER TABLE "SignatureBox"
  ADD CONSTRAINT "SignatureBox_relative_bounds"
  CHECK (
    "x" >= 0 AND "y" >= 0 AND "width" > 0 AND "height" > 0
    AND "x" + "width" <= 1 AND "y" + "height" <= 1
  );

DROP TRIGGER "CoverTemplateVersion_published_immutable"
  ON "CoverTemplateVersion";

CREATE TRIGGER "CoverTemplateVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "CoverTemplateVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_cover_version_mutation"();

CREATE TRIGGER "ReviewPageEvent_append_only_update"
BEFORE UPDATE ON "ReviewPageEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_review_page_event_mutation();

CREATE TRIGGER "ReviewPageEvent_append_only_delete"
BEFORE DELETE ON "ReviewPageEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_review_page_event_mutation();

CREATE UNIQUE INDEX "ClientResponseFile_one_primary_per_response"
  ON "ClientResponseFile"("clientResponseId")
  WHERE "isPrimary" = true;

DROP TRIGGER IF EXISTS "ClientResponseCodeSetVersion_published_immutable"
  ON "ClientResponseCodeSetVersion";

CREATE TRIGGER "ClientResponseCodeSetVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "ClientResponseCodeSetVersion"
FOR EACH ROW EXECUTE FUNCTION prevent_published_response_version_mutation();

CREATE TRIGGER "GeneralRequestTypeVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "GeneralRequestTypeVersion"
FOR EACH ROW EXECUTE FUNCTION prevent_published_request_version_mutation();

CREATE UNIQUE INDEX "ControlledMainFile_one_active_per_revision"
ON "ControlledMainFile" ("revisionId")
WHERE "isActive" = true AND "supersededAt" IS NULL;

ALTER TABLE "ReviewPageEvent"
ADD CONSTRAINT "ReviewPageEvent_page_check"
CHECK ("pageNumber" > 0);

ALTER TABLE "ReviewPageEvent"
ADD CONSTRAINT "ReviewPageEvent_active_check"
CHECK ("activeSeconds" >= 0 AND "activeSeconds" <= 300);
