import {
  ClientReplyState,
  DocumentFileType,
  NumberingSequenceScope,
  NumberingTokenType,
  RevisionStatus,
  ScopeLevel,
  StorageProvider,
  WorkflowStatus,
} from "@prisma/client"
import { prisma } from "@/lib/prisma/client"
import { seedWorkflowStepsForRevision } from "@/server/services/workflow/workflow-service"
import { assertSafeTestDatabaseUrl } from "../../helpers/database-safety.mjs"

const FIXED_DATE = new Date("2026-01-15T09:00:00.000Z")

export async function resetCharacterizationDatabase() {
  assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL)

  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `

  if (tables.length > 0) {
    const names = tables
      .map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)
      .join(", ")
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`
    )
  }
}

export async function createCharacterizationBaseline() {
  const permission = await prisma.permission.create({
    data: {
      code: "dashboard.view",
      name: "View dashboard",
      group: "characterization",
    },
  })
  const role = await prisma.role.create({
    data: {
      code: "super_admin",
      name: "Synthetic super administrator",
      isSystem: true,
      rolePermissions: {
        create: {
          permissionId: permission.id,
        },
      },
    },
  })
  const user = await prisma.user.create({
    data: {
      email: "characterization.user@example.invalid",
      fullName: "Characterization User",
      timezone: "Asia/Riyadh",
      signatureProfile: {
        create: {
          signatureFilePath: "synthetic/signature.png",
          initialsFilePath: "synthetic/initials.png",
          mimeType: "image/png",
        },
      },
      userRoles: {
        create: {
          roleId: role.id,
        },
      },
    },
  })
  const client = await prisma.client.create({
    data: {
      code: "TCL",
      name: "Test Client",
    },
  })
  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      code: "TPR",
      name: "Test Project",
    },
  })
  const otherProject = await prisma.project.create({
    data: {
      clientId: client.id,
      code: "OTH",
      name: "Other Project",
    },
  })
  const discipline = await prisma.discipline.create({
    data: {
      code: "TST",
      name: "Test Discipline",
    },
  })
  const documentType = await prisma.documentTypeCategory.create({
    data: {
      scopeLevel: ScopeLevel.Global,
      scopeKey: "system",
      code: "DWG",
      name: "Drawing",
    },
  })
  const releasePurpose = await prisma.releasePurpose.create({
    data: {
      scopeLevel: ScopeLevel.Global,
      scopeKey: "system",
      code: "IFA",
      name: "Issued for Approval",
    },
  })
  const numberingRule = await prisma.numberingRule.create({
    data: {
      scopeLevel: ScopeLevel.Global,
      scopeKey: "system",
      name: "Characterization rule",
      formatString: "{project}-{discipline}-{documentType}-{sequence}",
      sequenceScope: NumberingSequenceScope.PER_PROJECT,
      padding: 3,
      separator: "-",
      isDefault: true,
      tokens: {
        create: [
          {
            order: 1,
            tokenType: NumberingTokenType.ProjectCode,
            key: "project",
          },
          {
            order: 2,
            tokenType: NumberingTokenType.DisciplineCode,
            key: "discipline",
          },
          {
            order: 3,
            tokenType: NumberingTokenType.DocumentTypeCode,
            key: "documentType",
          },
          {
            order: 4,
            tokenType: NumberingTokenType.Sequence,
            key: "sequence",
            padding: 3,
          },
        ],
      },
    },
  })
  const revisionRequiredCode = await prisma.reviewCode.create({
    data: {
      scopeLevel: ScopeLevel.Global,
      scopeKey: "system",
      code: "REV",
      label: "Revision required",
      requiresResubmittal: true,
    },
  })
  const informationCode = await prisma.reviewCode.create({
    data: {
      scopeLevel: ScopeLevel.Global,
      scopeKey: "system",
      code: "INF",
      label: "Information only",
      informationalOnly: true,
    },
  })
  const finalCode = await prisma.reviewCode.create({
    data: {
      scopeLevel: ScopeLevel.Global,
      scopeKey: "system",
      code: "FIN",
      label: "Final acceptance",
      finalizesDocument: true,
    },
  })
  const actor = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: {
      signatureProfile: true,
      userRoles: { include: { role: true } },
      projectRoles: {
        include: {
          role: true,
          project: {
            select: { code: true, name: true },
          },
        },
      },
    },
  })

  return {
    actor,
    client,
    project,
    otherProject,
    discipline,
    documentType,
    releasePurpose,
    numberingRule,
    revisionRequiredCode,
    informationCode,
    finalCode,
    fixedDate: FIXED_DATE,
  }
}

export async function createDocumentFixture(
  baseline: Awaited<ReturnType<typeof createCharacterizationBaseline>>,
  options: {
    documentNumber?: string
    title?: string
    workflowStatus?: WorkflowStatus
    clientReplyState?: ClientReplyState
    revisionLabel?: string
    projectId?: string
  } = {}
) {
  const workflowStatus = options.workflowStatus ?? WorkflowStatus.Draft
  const projectId = options.projectId ?? baseline.project.id
  const document = await prisma.mdrDocument.create({
    data: {
      projectId,
      disciplineId: baseline.discipline.id,
      documentTypeCategoryId: baseline.documentType.id,
      releasePurposeId: baseline.releasePurpose.id,
      dtgsaDocumentNumber: options.documentNumber ?? "TPR-TST-DWG-900",
      title: options.title ?? "Synthetic characterization document",
      currentWorkflowStatus: workflowStatus,
      currentClientReplyState:
        options.clientReplyState ?? ClientReplyState.WaitingClientReply,
      createdByUserId: baseline.actor.id,
    },
  })
  const revision = await prisma.documentRevision.create({
    data: {
      documentId: document.id,
      revisionLabel: options.revisionLabel ?? "00",
      revisionIndex: 0,
      workflowStatus,
      revisionStatus: RevisionStatus.Original,
      clientReplyState:
        options.clientReplyState ?? ClientReplyState.WaitingClientReply,
      isCurrent: true,
      createdByUserId: baseline.actor.id,
      submittedToClientAt:
        workflowStatus === WorkflowStatus.SubmittedToClient ? FIXED_DATE : null,
    },
  })
  await seedWorkflowStepsForRevision(prisma, revision.id)
  await prisma.mdrDocument.update({
    where: { id: document.id },
    data: { currentRevisionId: revision.id },
  })
  const file = await prisma.documentFile.create({
    data: {
      documentRevisionId: revision.id,
      projectId,
      type: DocumentFileType.SOURCE,
      storageProvider: StorageProvider.Temporary,
      fileName: "synthetic-source.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 128,
      storagePath: "synthetic/source.pdf",
      checksum: "synthetic-checksum",
      uploadedByUserId: baseline.actor.id,
    },
  })

  return { document, revision, file }
}
