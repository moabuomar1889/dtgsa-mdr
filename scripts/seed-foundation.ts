import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  NumberingSequenceScope,
  NumberingTokenType,
  PrismaClient,
  ScopeLevel,
} from "@prisma/client"
import {
  PERMISSIONS,
  ROLE_CODES,
  ROLE_PERMISSION_MAP,
} from "@/lib/permissions/rbac"

const GLOBAL_SCOPE_KEY = "system"
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
})

const roleDefinitions: Record<
  (typeof ROLE_CODES)[keyof typeof ROLE_CODES],
  { name: string; description: string; isSystem?: boolean }
> = {
  [ROLE_CODES.superAdmin]: {
    name: "Super Admin",
    description: "Full platform ownership across all modules and projects.",
    isSystem: true,
  },
  [ROLE_CODES.systemAdmin]: {
    name: "System Admin",
    description:
      "Administrative control over users, settings, masters, and templates.",
    isSystem: true,
  },
  [ROLE_CODES.documentControlAdmin]: {
    name: "DTGSA Document Control Admin",
    description:
      "Project setup, PDI/MDR management, transmittals, replies, and Drive orchestration.",
  },
  [ROLE_CODES.documentControlUser]: {
    name: "DTGSA Document Control User",
    description:
      "Operational document-control work for PDI, MDR checks, and submissions.",
  },
  [ROLE_CODES.disciplineUser]: {
    name: "Discipline User / Engineer",
    description:
      "Prepares documents, uploads files, and maintains discipline-owned metadata.",
  },
  [ROLE_CODES.reviewer]: {
    name: "Reviewer",
    description: "Performs discipline review and rejection/approval actions.",
  },
  [ROLE_CODES.approver]: {
    name: "Approver",
    description: "Final internal approval authority before DC submission.",
  },
  [ROLE_CODES.projectViewer]: {
    name: "Project Manager / Viewer",
    description: "Read-only visibility into project dashboards and reporting.",
  },
  [ROLE_CODES.clientDocumentControlUser]: {
    name: "Client Document Control User",
    description:
      "Client-side portal role for numbering collaboration and restricted record visibility.",
  },
}

const permissionDescriptions: Record<
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
  { name: string; group: string; description: string }
> = {
  [PERMISSIONS.platformManage]: {
    name: "Manage Platform",
    group: "platform",
    description:
      "Manage global platform behavior and high-level administration.",
  },
  [PERMISSIONS.usersManage]: {
    name: "Manage Users",
    group: "identity",
    description: "Create, update, deactivate, and review user access.",
  },
  [PERMISSIONS.rolesManage]: {
    name: "Manage Roles",
    group: "identity",
    description: "Maintain roles, permission mappings, and access models.",
  },
  [PERMISSIONS.clientsManage]: {
    name: "Manage Clients",
    group: "clients",
    description: "Create and maintain client records and defaults.",
  },
  [PERMISSIONS.projectsManage]: {
    name: "Manage Projects",
    group: "projects",
    description:
      "Create and maintain projects, mappings, and project settings.",
  },
  [PERMISSIONS.mastersManage]: {
    name: "Manage Masters",
    group: "masters",
    description:
      "Maintain disciplines, document types, release purposes, and review codes.",
  },
  [PERMISSIONS.numberingManage]: {
    name: "Manage Numbering Rules",
    group: "numbering",
    description: "Create and update numbering rules, scopes, and sequences.",
  },
  [PERMISSIONS.templatesManage]: {
    name: "Manage Templates",
    group: "templates",
    description:
      "Manage cover sheets, transmittal templates, and generated outputs.",
  },
  [PERMISSIONS.auditView]: {
    name: "View Audit Logs",
    group: "audit",
    description: "View business audit logs and technical system logs.",
  },
  [PERMISSIONS.pdiManage]: {
    name: "Manage PDI",
    group: "pdi",
    description:
      "Maintain the project document index and related collaboration state.",
  },
  [PERMISSIONS.pdiCollaborate]: {
    name: "Collaborate on PDI",
    group: "pdi",
    description: "Participate in client-side numbering and PDI collaboration.",
  },
  [PERMISSIONS.mdrManage]: {
    name: "Manage MDR",
    group: "mdr",
    description:
      "Create and maintain operational document records and metadata.",
  },
  [PERMISSIONS.workflowPrepare]: {
    name: "Prepare Workflow",
    group: "workflow",
    description: "Upload, prepare, and sign documents as preparer.",
  },
  [PERMISSIONS.workflowReview]: {
    name: "Review Workflow",
    group: "workflow",
    description: "Review and reject/approve documents as reviewer.",
  },
  [PERMISSIONS.workflowApprove]: {
    name: "Approve Workflow",
    group: "workflow",
    description: "Approve or reject documents as approver.",
  },
  [PERMISSIONS.dcCheck]: {
    name: "Perform DC Check",
    group: "workflow",
    description: "Validate internally approved packages before submission.",
  },
  [PERMISSIONS.transmittalsManage]: {
    name: "Manage Transmittals",
    group: "transmittals",
    description: "Create, validate, send, and track transmittals.",
  },
  [PERMISSIONS.clientRepliesManage]: {
    name: "Manage Client Replies",
    group: "replies",
    description: "Record and process client review responses and next actions.",
  },
  [PERMISSIONS.driveManage]: {
    name: "Manage Drive Mappings",
    group: "drive",
    description: "Link projects to Shared Drive folders and upload outputs.",
  },
  [PERMISSIONS.notificationsManage]: {
    name: "Manage Notifications",
    group: "notifications",
    description: "Send and manage in-app and email notifications.",
  },
  [PERMISSIONS.dashboardView]: {
    name: "View Dashboards",
    group: "dashboard",
    description: "View role-based dashboards, metrics, and task queues.",
  },
}

const disciplines = [
  ["HSE", "Health, Safety & Environment"],
  ["QC", "Quality Control"],
  ["CON", "Construction"],
  ["PC", "Project Control"],
  ["PM", "Project Management"],
  ["COM", "Commissioning"],
  ["QAC", "Quality Assurance & Control"],
  ["STR", "Structural"],
  ["ELE", "Electrical"],
] as const

const documentTypes = [
  ["ITP", "Inspection & Test Plan"],
  ["MAR", "Material Approval Request"],
  ["PLAN", "Plan"],
  ["PROC", "Procedure"],
  ["RPT", "Report"],
  ["DRW", "Drawing"],
  ["RA", "Risk Assessment"],
] as const

const releasePurposes = [
  ["IFR", "Issued for Review"],
  ["IFC", "Issued for Construction"],
  ["ASB", "As Built"],
] as const

const reviewCodes = [
  {
    code: "1",
    label: "Rejected - Resubmit for Review",
    description: "Rejected and must be resubmitted for review.",
    requiresResubmittal: true,
  },
  {
    code: "2",
    label: "Rejected with Comments - Resubmit for Review",
    description: "Rejected with comments and must be resubmitted for review.",
    requiresResubmittal: true,
  },
  {
    code: "3",
    label: "Comments as Noted - Resubmit for Review",
    description: "Comments noted and a resubmission is required.",
    requiresResubmittal: true,
  },
  {
    code: "4",
    label: "No Comments - No Further Submittal Unless Revised",
    description: "Accepted with no further submittal unless revised.",
    finalizesDocument: true,
  },
  {
    code: "5",
    label: "For Information Only",
    description: "For information only with no mandatory follow-up.",
    informationalOnly: true,
  },
]

async function seedRolesAndPermissions() {
  const createdPermissions = new Map<string, string>()

  for (const permissionCode of Object.values(PERMISSIONS)) {
    const definition = permissionDescriptions[permissionCode]
    const permission = await prisma.permission.upsert({
      where: {
        code: permissionCode,
      },
      update: {
        name: definition.name,
        group: definition.group,
        description: definition.description,
      },
      create: {
        code: permissionCode,
        name: definition.name,
        group: definition.group,
        description: definition.description,
      },
    })

    createdPermissions.set(permission.code, permission.id)
  }

  for (const roleCode of Object.values(ROLE_CODES)) {
    const definition = roleDefinitions[roleCode]
    const role = await prisma.role.upsert({
      where: {
        code: roleCode,
      },
      update: {
        name: definition.name,
        description: definition.description,
        isSystem: Boolean(definition.isSystem),
      },
      create: {
        code: roleCode,
        name: definition.name,
        description: definition.description,
        isSystem: Boolean(definition.isSystem),
      },
    })

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    })

    const permissions = ROLE_PERMISSION_MAP[roleCode].map((permissionCode) => ({
      roleId: role.id,
      permissionId: createdPermissions.get(permissionCode)!,
    }))

    await prisma.rolePermission.createMany({
      data: permissions,
      skipDuplicates: true,
    })
  }
}

async function seedMasters() {
  for (const [code, name] of disciplines) {
    await prisma.discipline.upsert({
      where: {
        code,
      },
      update: {
        name,
        isActive: true,
      },
      create: {
        code,
        name,
        isActive: true,
      },
    })
  }

  for (const [code, name] of documentTypes) {
    await prisma.documentTypeCategory.upsert({
      where: {
        scopeLevel_scopeKey_code: {
          scopeLevel: ScopeLevel.Global,
          scopeKey: GLOBAL_SCOPE_KEY,
          code,
        },
      },
      update: {
        name,
        isActive: true,
      },
      create: {
        scopeLevel: ScopeLevel.Global,
        scopeKey: GLOBAL_SCOPE_KEY,
        code,
        name,
        isActive: true,
      },
    })
  }

  for (const [code, name] of releasePurposes) {
    await prisma.releasePurpose.upsert({
      where: {
        scopeLevel_scopeKey_code: {
          scopeLevel: ScopeLevel.Global,
          scopeKey: GLOBAL_SCOPE_KEY,
          code,
        },
      },
      update: {
        name,
        isActive: true,
      },
      create: {
        scopeLevel: ScopeLevel.Global,
        scopeKey: GLOBAL_SCOPE_KEY,
        code,
        name,
        isActive: true,
      },
    })
  }

  for (const [index, reviewCode] of reviewCodes.entries()) {
    await prisma.reviewCode.upsert({
      where: {
        scopeLevel_scopeKey_code: {
          scopeLevel: ScopeLevel.Global,
          scopeKey: GLOBAL_SCOPE_KEY,
          code: reviewCode.code,
        },
      },
      update: {
        label: reviewCode.label,
        description: reviewCode.description,
        requiresResubmittal: Boolean(reviewCode.requiresResubmittal),
        finalizesDocument: Boolean(reviewCode.finalizesDocument),
        informationalOnly: Boolean(reviewCode.informationalOnly),
        displayOrder: index + 1,
        isDefault: true,
        isActive: true,
      },
      create: {
        scopeLevel: ScopeLevel.Global,
        scopeKey: GLOBAL_SCOPE_KEY,
        code: reviewCode.code,
        label: reviewCode.label,
        description: reviewCode.description,
        requiresResubmittal: Boolean(reviewCode.requiresResubmittal),
        finalizesDocument: Boolean(reviewCode.finalizesDocument),
        informationalOnly: Boolean(reviewCode.informationalOnly),
        displayOrder: index + 1,
        isDefault: true,
        isActive: true,
      },
    })
  }
}

async function seedDefaultNumberingRule() {
  const rule = await prisma.numberingRule.upsert({
    where: {
      scopeLevel_scopeKey_name: {
        scopeLevel: ScopeLevel.Global,
        scopeKey: GLOBAL_SCOPE_KEY,
        name: "DTGSA Default Document Number",
      },
    },
    update: {
      description:
        "Default token-based numbering rule that can be overridden at client or project level.",
      formatString:
        "{CLIENT}-{PROJECT}-{DISCIPLINE}-{DOC_TYPE}-{PURPOSE}-{SEQ}",
      sequenceScope: NumberingSequenceScope.CUSTOM_KEY,
      padding: 4,
      separator: "-",
      isDefault: true,
      isActive: true,
    },
    create: {
      scopeLevel: ScopeLevel.Global,
      scopeKey: GLOBAL_SCOPE_KEY,
      name: "DTGSA Default Document Number",
      description:
        "Default token-based numbering rule that can be overridden at client or project level.",
      formatString:
        "{CLIENT}-{PROJECT}-{DISCIPLINE}-{DOC_TYPE}-{PURPOSE}-{SEQ}",
      sequenceScope: NumberingSequenceScope.CUSTOM_KEY,
      padding: 4,
      separator: "-",
      isDefault: true,
      isActive: true,
    },
  })

  await prisma.numberingRuleToken.deleteMany({
    where: {
      ruleId: rule.id,
    },
  })

  await prisma.numberingRuleToken.createMany({
    data: [
      {
        ruleId: rule.id,
        order: 1,
        tokenType: NumberingTokenType.ClientCode,
        key: "CLIENT",
      },
      {
        ruleId: rule.id,
        order: 2,
        tokenType: NumberingTokenType.ProjectCode,
        key: "PROJECT",
      },
      {
        ruleId: rule.id,
        order: 3,
        tokenType: NumberingTokenType.DisciplineCode,
        key: "DISCIPLINE",
      },
      {
        ruleId: rule.id,
        order: 4,
        tokenType: NumberingTokenType.DocumentTypeCode,
        key: "DOC_TYPE",
      },
      {
        ruleId: rule.id,
        order: 5,
        tokenType: NumberingTokenType.ReleasePurposeCode,
        key: "PURPOSE",
      },
      {
        ruleId: rule.id,
        order: 6,
        tokenType: NumberingTokenType.Sequence,
        key: "SEQ",
        padding: 4,
      },
    ],
  })
}

async function seedPhase3DevelopmentFixtures() {
  await prisma.retentionRule.upsert({
    where: {
      recordClass_version: {
        recordClass: "development-controlled-file",
        version: 1,
      },
    },
    update: {
      retentionDays: 365,
      disposition: "review",
      isActive: true,
    },
    create: {
      recordClass: "development-controlled-file",
      version: 1,
      retentionDays: 365,
      disposition: "review",
      isActive: true,
    },
  })

  await prisma.configurationVersion.upsert({
    where: {
      scope_scopeId_version: {
        scope: "development",
        scopeId: "phase-3",
        version: 1,
      },
    },
    update: {
      content: { fixture: "phase-3-foundation" },
      contentHash: "development-phase-3-foundation-v1",
    },
    create: {
      scope: "development",
      scopeId: "phase-3",
      version: 1,
      content: { fixture: "phase-3-foundation" },
      contentHash: "development-phase-3-foundation-v1",
    },
  })

  await prisma.publicVerificationPolicy.upsert({
    where: {
      projectId_version: {
        projectId: "development-phase-3",
        version: 1,
      },
    },
    update: {
      fields: { documentNumber: true, revision: true },
      isActive: true,
    },
    create: {
      projectId: "development-phase-3",
      version: 1,
      fields: { documentNumber: true, revision: true },
      isActive: true,
    },
  })
}

async function main() {
  await seedRolesAndPermissions()
  await seedMasters()
  await seedDefaultNumberingRule()

  if (process.env.SEED_PHASE3_FOUNDATION === "true") {
    await seedPhase3DevelopmentFixtures()
  }

  console.log("Foundation seed completed.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
