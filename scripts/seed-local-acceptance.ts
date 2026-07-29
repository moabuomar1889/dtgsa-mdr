import { createHash } from "node:crypto"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { LOCAL_SYNTHETIC_USERS } from "@dtg/local-acceptance"

if (process.env.LOCAL_ACCEPTANCE_MODE !== "true") {
  throw new Error("Synthetic local seed requires LOCAL_ACCEPTANCE_MODE=true.")
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL is required.")
const parsed = new URL(databaseUrl)
if (
  !["127.0.0.1", "localhost", "::1"].includes(parsed.hostname) ||
  !/(local|test|demo)/.test(parsed.pathname.toLowerCase())
) {
  throw new Error("Synthetic local seed refuses a non-local database.")
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})

const userRoleByEmail: Record<string, string[]> = {
  "dc.admin@local.test": ["super_admin", "system_admin", "dtgsa_dc_admin"],
  "dc.operator@local.test": ["dtgsa_dc_user"],
  "prepared.manager@local.test": ["discipline_user"],
  "reviewer@local.test": ["reviewer"],
  "approver@local.test": ["approver"],
  "additional.manager@local.test": ["approver"],
  "dc.validator@local.test": ["dtgsa_dc_user"],
  "auditor@local.test": ["system_admin"],
  "project.viewer@local.test": ["project_viewer"],
  "client.user@local.test": ["client_dc_user"],
}

const responseProfiles = [
  {
    clientCode: "LOCAL-AP",
    setCode: "AIR-STYLE",
    name: "Synthetic four-code response profile",
    codes: [
      ["1", "Approved", true, true, false],
      ["2", "Approved with mandatory correction", true, false, true],
      ["3", "Revise and resubmit", false, false, true],
      ["4", "Rejected", false, false, true],
    ],
  },
  {
    clientCode: "LOCAL-JG",
    setCode: "JIGPC-STYLE",
    name: "Synthetic five-code response profile",
    codes: [
      ["1", "Approved", true, true, false],
      ["2", "Approved with comments", true, false, true],
      ["3", "Revise and resubmit", false, false, true],
      ["4", "Final approved", true, true, false],
      ["5", "For information", false, false, false],
    ],
  },
] as const

async function seedUsers() {
  const roles = await prisma.role.findMany()
  const roleIds = new Map(roles.map((role) => [role.code, role.id]))
  for (const identity of LOCAL_SYNTHETIC_USERS) {
    const user = await prisma.user.upsert({
      where: { email: identity.primaryEmail },
      update: {
        fullName: identity.fullName,
        jobTitle: identity.jobTitle,
        isActive: !identity.suspended,
        deletedAt: null,
      },
      create: {
        email: identity.primaryEmail,
        fullName: identity.fullName,
        jobTitle: identity.jobTitle,
        timezone: "Asia/Amman",
        isActive: !identity.suspended,
      },
    })
    for (const roleCode of userRoleByEmail[user.email] ?? []) {
      const roleId = roleIds.get(roleCode)
      if (!roleId) continue
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: { userId: user.id, roleId },
      })
    }
  }
}

async function seedOrganization() {
  const clients = [
    ["LOCAL-AP", "Northstar Industrial Services"],
    ["LOCAL-JG", "Blue Dune Energy"],
  ] as const
  for (const [code, name] of clients) {
    await prisma.client.upsert({
      where: { code },
      update: { name, isActive: true, deletedAt: null },
      create: {
        code,
        name,
        description: "Synthetic local acceptance client.",
        defaultTimezone: "Asia/Amman",
      },
    })
  }
  const ap = await prisma.client.findUniqueOrThrow({
    where: { code: "LOCAL-AP" },
  })
  const jg = await prisma.client.findUniqueOrThrow({
    where: { code: "LOCAL-JG" },
  })
  const projects = [
    [ap.id, "LOCAL-ALPHA", "Atlas Water Treatment"],
    [ap.id, "LOCAL-BETA", "Cedar Utilities Upgrade"],
    [jg.id, "LOCAL-GAMMA", "Wadi Solar Expansion"],
  ] as const
  for (const [clientId, code, name] of projects) {
    await prisma.project.upsert({
      where: { clientId_code: { clientId, code } },
      update: { name, isActive: true, deletedAt: null },
      create: {
        clientId,
        code,
        name,
        description: "Synthetic local acceptance project.",
        timezone: "Asia/Amman",
      },
    })
  }
}

async function seedDocuments() {
  const project = await prisma.project.findFirstOrThrow({
    where: { code: "LOCAL-ALPHA" },
  })
  const discipline = await prisma.discipline.findFirstOrThrow({
    where: { code: "ELE" },
  })
  const register = await prisma.pdiRegister.upsert({
    where: { projectId: project.id },
    update: { title: "Synthetic Atlas PDI", isActive: true },
    create: { projectId: project.id, title: "Synthetic Atlas PDI" },
  })
  const item = await prisma.pdiItem.upsert({
    where: {
      projectId_dtgsaDocumentNumber: {
        projectId: project.id,
        dtgsaDocumentNumber: "LOCAL-ALPHA-ELE-DRW-0001",
      },
    },
    update: { title: "Single-line diagram", deletedAt: null },
    create: {
      registerId: register.id,
      projectId: project.id,
      disciplineId: discipline.id,
      dtgsaDocumentNumber: "LOCAL-ALPHA-ELE-DRW-0001",
      clientDocumentNumber: "SYN-CLIENT-001",
      title: "Single-line diagram",
      status: "ConvertedToMdr",
      tags: ["synthetic", "acceptance"],
    },
  })
  const document = await prisma.mdrDocument.upsert({
    where: {
      projectId_dtgsaDocumentNumber: {
        projectId: project.id,
        dtgsaDocumentNumber: item.dtgsaDocumentNumber,
      },
    },
    update: { title: item.title, deletedAt: null },
    create: {
      projectId: project.id,
      disciplineId: discipline.id,
      sourcePdiItemId: item.id,
      dtgsaDocumentNumber: item.dtgsaDocumentNumber,
      clientDocumentNumber: item.clientDocumentNumber,
      title: item.title,
    },
  })
  const revision = await prisma.documentRevision.upsert({
    where: {
      documentId_revisionLabel: {
        documentId: document.id,
        revisionLabel: "00",
      },
    },
    update: { isCurrent: true, deletedAt: null },
    create: {
      documentId: document.id,
      revisionLabel: "00",
      revisionIndex: 0,
      isCurrent: true,
    },
  })
  await prisma.mdrDocument.update({
    where: { id: document.id },
    data: { currentRevisionId: revision.id },
  })
}

async function seedResponseProfiles() {
  for (const profile of responseProfiles) {
    const client = await prisma.client.findUniqueOrThrow({
      where: { code: profile.clientCode },
    })
    const codeSet = await prisma.clientResponseCodeSet.upsert({
      where: {
        clientId_code: { clientId: client.id, code: profile.setCode },
      },
      update: { name: profile.name },
      create: {
        clientId: client.id,
        code: profile.setCode,
        name: profile.name,
      },
    })
    const snapshotHash = createHash("sha256")
      .update(JSON.stringify(profile.codes))
      .digest("hex")
    const version = await prisma.clientResponseCodeSetVersion.upsert({
      where: { codeSetId_version: { codeSetId: codeSet.id, version: 1 } },
      update: {},
      create: {
        codeSetId: codeSet.id,
        version: 1,
        status: "Draft",
      },
    })
    if (version.status === "Draft") {
      for (const [
        externalCode,
        label,
        approved,
        final,
        correction,
      ] of profile.codes) {
        await prisma.clientResponseCode.upsert({
          where: {
            versionId_externalCode: { versionId: version.id, externalCode },
          },
          update: {
            exactWording: label,
            internalLabel: label,
            countsAsApproved: approved,
            finalApproval: final,
            requiresCommentRectification: correction,
            requiresNewRevision: correction,
            requiresInternalReapproval: correction,
            requiresResubmission: correction,
          },
          create: {
            versionId: version.id,
            externalCode,
            exactWording: label,
            internalLabel: label,
            outcomeClass: final
              ? "FINAL_APPROVED"
              : approved
                ? "CONDITIONALLY_APPROVED"
                : "REJECTED",
            countsAsApproved: approved,
            finalApproval: final,
            requiresCommentRectification: correction,
            requiresNewRevision: correction,
            requiresInternalReapproval: correction,
            requiresResubmission: correction,
            allowsLifecycleClosure: final,
            displayOrder: Number(externalCode),
          },
        })
      }
      await prisma.clientResponseCodeSetVersion.update({
        where: { id: version.id },
        data: {
          status: "Published",
          publishedAt: new Date(),
          snapshotHash,
        },
      })
    }
  }
}

async function seedGeneralRequests() {
  const requests = [
    ["LEAVE", "Leave Request", "Human Resources"],
    ["ADVANCE", "Employee Advance", "Finance"],
    ["TRIP", "Business Trip", "Administration"],
    ["OVERTIME", "Overtime", "Human Resources"],
    ["ASSET", "Asset Request", "Information Technology"],
    ["ACK", "Employee Acknowledgement", "Human Resources"],
    ["ADMIN", "General Administrative Approval", "Administration"],
  ] as const
  for (const [code, name, departmentOwner] of requests) {
    const type = await prisma.generalRequestType.upsert({
      where: { code },
      update: { name, departmentOwner },
      create: { code, name, departmentOwner },
    })
    await prisma.generalRequestTypeVersion.upsert({
      where: { requestTypeId_version: { requestTypeId: type.id, version: 1 } },
      update: {},
      create: {
        requestTypeId: type.id,
        version: 1,
        status: "Published",
        publishedAt: new Date(),
        formDefinition: {
          fields: [
            { key: "details", label: "Request details", type: "textarea" },
          ],
        },
      },
    })
  }
}

async function seedOperationalEvidence() {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "dc.admin@local.test" },
  })
  await prisma.notification.upsert({
    where: { id: "local-acceptance-notification" },
    update: { status: "Pending" },
    create: {
      id: "local-acceptance-notification",
      userId: admin.id,
      channel: "InApp",
      title: "Local acceptance is ready",
      body: "Synthetic demonstration data has been loaded.",
      metadata: { synthetic: true },
    },
  })
  const existing = await prisma.auditLog.findFirst({
    where: {
      action: "local_acceptance.seed_completed",
      entityId: "phase-16l",
    },
  })
  if (!existing) {
    await prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        action: "local_acceptance.seed_completed",
        entityType: "LocalAcceptance",
        entityId: "phase-16l",
        afterSnapshot: { synthetic: true, externalProvidersUsed: false },
      },
    })
  }
}

async function main() {
  await seedUsers()
  await seedOrganization()
  await seedDocuments()
  await seedResponseProfiles()
  await seedGeneralRequests()
  await seedOperationalEvidence()
  console.log("Synthetic local acceptance seed completed.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
