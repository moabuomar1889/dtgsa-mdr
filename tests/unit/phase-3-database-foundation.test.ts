import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import test from "node:test"

const root = process.cwd()
const requiredModels = [
  "UserIdentity",
  "GoogleWorkspaceIdentity",
  "ExternalPortalIdentity",
  "GoogleGroupMapping",
  "EmployeeProfile",
  "EmployeeSignatureAppearanceVersion",
  "Department",
  "Delegation",
  "EmergencyOverrideRequest",
  "EmergencyOverrideApproval",
  "RecentAuthenticationEvidence",
  "FileObject",
  "SourceFileReference",
  "DriveFileIdentity",
  "ControlledMainFile",
  "ControlledAttachment",
  "ClientResponseFile",
  "GeneratedArtifactRecord",
  "FileIntegrityCheck",
  "StorageFolderRule",
  "UploadSession",
  "ReconciliationRun",
  "WorkflowDefinition",
  "WorkflowDefinitionVersion",
  "WorkflowDefinitionStep",
  "WorkflowParallelGroup",
  "WorkflowSnapshot",
  "WorkflowSnapshotStep",
  "ApprovalCycle",
  "WorkflowStepInstance",
  "WorkflowAssignment",
  "ApprovalDecision",
  "ReviewSession",
  "SignerReassignment",
  "DelegationUse",
  "SeparationOfDutiesEvaluation",
  "CoverTemplate",
  "CoverTemplateVersion",
  "CoverLayoutElement",
  "CoverFieldBinding",
  "SignatureBox",
  "GeneratedCover",
  "CoverTemplateInheritanceRule",
  "PackageManifest",
  "PackageManifestItem",
  "PackageHash",
  "ApprovalEvidence",
  "PlatformSeal",
  "TimestampEvidence",
  "VerificationRecord",
  "VerificationCode",
  "PublicVerificationPolicy",
  "ClientResponseCodeSet",
  "ClientResponseCodeSetVersion",
  "ClientResponseCode",
  "ProjectResponseCodeConfiguration",
  "ClientResponsePolicySnapshot",
  "ClientResponse",
  "ClientResponseAttachment",
  "ClientSubmission",
  "Comment",
  "CommentLocation",
  "CommentAssignment",
  "CommentStatusEvent",
  "CommentAttachment",
  "OutboxEvent",
  "BackgroundJob",
  "JobAttempt",
  "DeliveryAttempt",
  "IdempotencyRecord",
  "IntegrationClient",
  "IntegrationScope",
  "WebhookEndpoint",
  "WebhookDelivery",
  "RetentionRule",
  "ConfigurationVersion",
  "AuditIntegrityCheckpoint",
]

test("Phase 3 schema contains every authorized foundation model", async () => {
  const schema = await readFile(join(root, "prisma/schema.prisma"), "utf8")
  const missing = requiredModels.filter(
    (model) => !schema.includes(`model ${model} {`)
  )
  assert.deepEqual(missing, [])
})

test("Phase 3 schema keeps every owning relation explicit and restrictive", async () => {
  const schema = await readFile(join(root, "prisma/schema.prisma"), "utf8")
  const phase3Schema = schema.slice(
    schema.indexOf("model UserIdentity {"),
    schema.indexOf("model SystemLog {")
  )
  const owningRelations = phase3Schema.match(
    /^\s+\w+\s+\w+\??\s+@relation\(fields: \[[^\]]+\], references: \[id\], onDelete: Restrict\)$/gm
  )

  assert.equal(owningRelations?.length, 24)
})

test("Phase 3 migration contains database-enforced invariants", async () => {
  const sql = await readFile(
    join(
      root,
      "prisma/migrations/20260729111500_phase3_database_foundation/migration.sql"
    ),
    "utf8"
  )
  assert.match(sql, /ControlledMainFile_one_active_per_revision/)
  assert.match(sql, /ApprovalCycle_one_active_per_revision/)
  assert.match(sql, /prevent_published_version_mutation/)
  assert.match(sql, /prevent_published_workflow_content_mutation/)
  assert.match(sql, /prevent_published_cover_content_mutation/)
  assert.match(sql, /prevent_published_response_code_mutation/)
  assert.match(sql, /AuditLog_append_only/)
})

test("database role template is password-free and least-privileged", async () => {
  const sql = await readFile(
    join(root, "infrastructure/database/roles.sql"),
    "utf8"
  )
  assert.doesNotMatch(sql, /PASSWORD/i)
  assert.match(sql, /NOSUPERUSER NOCREATEDB NOCREATEROLE/)
  assert.match(sql, /REVOKE UPDATE, DELETE ON TABLE "AuditLog"/)
  assert.match(sql, /search_path = public, pg_catalog/)
})
