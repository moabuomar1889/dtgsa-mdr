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
CREATE TYPE "StorageProvider" AS ENUM ('Supabase', 'GoogleDrive', 'Temporary');

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
    "authUserId" TEXT,
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
    "signatureFilePath" TEXT,
    "initialsFilePath" TEXT,
    "storageBucket" TEXT,
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
    "signatureImagePath" TEXT,
    "initialsImagePath" TEXT,
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
    "storageBucket" TEXT,
    "storagePath" TEXT,
    "googleDriveFileId" TEXT,
    "googleDriveFolderId" TEXT,
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
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'Supabase',
    "storageBucket" TEXT,
    "storagePath" TEXT,
    "googleDriveFileId" TEXT,
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
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'Supabase',
    "storageBucket" TEXT,
    "storagePath" TEXT,
    "googleDriveFileId" TEXT,
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
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'Supabase',
    "storageBucket" TEXT,
    "storagePath" TEXT,
    "googleDriveFileId" TEXT,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

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
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_projectId_createdAt_idx" ON "AuditLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_clientId_createdAt_idx" ON "AuditLog"("clientId", "createdAt");

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
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
