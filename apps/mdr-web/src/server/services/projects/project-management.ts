import "server-only"
import { DriveFolderType } from "@prisma/client"
import { prisma } from "@/lib/prisma/client"
import { projectOnboardingSchema } from "@/lib/forms/project-onboarding"

export class ProjectDriveFolderConflictError extends Error {
  constructor(projectCode: string) {
    super(
      `That Google Drive folder is already linked to project ${projectCode}.`
    )
    this.name = "ProjectDriveFolderConflictError"
  }
}

export class ProjectCodeConflictError extends Error {
  constructor(projectCode: string) {
    super(`Project code ${projectCode} is already in use for this client.`)
    this.name = "ProjectCodeConflictError"
  }
}

function normalizeProjectCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function listProjects() {
  return prisma.project.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [{ code: "asc" }],
    include: {
      client: {
        select: {
          code: true,
          name: true,
        },
      },
      driveMappings: {
        where: {
          folderType: DriveFolderType.ROOT,
          isActive: true,
        },
        orderBy: [{ createdAt: "asc" }],
      },
      _count: {
        select: {
          mdrDocuments: true,
          transmittals: true,
        },
      },
    },
  })
}

export async function createProjectFromDriveFolder(input: unknown) {
  const parsed = projectOnboardingSchema.parse(input)
  const code = normalizeProjectCode(parsed.code)

  const [existingFolderMapping, existingProject] = await Promise.all([
    prisma.driveMapping.findFirst({
      where: {
        folderId: parsed.driveFolderId,
        isActive: true,
      },
      include: {
        project: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    }),
    prisma.project.findUnique({
      where: {
        clientId_code: {
          clientId: parsed.clientId,
          code,
        },
      },
      select: {
        code: true,
      },
    }),
  ])

  if (existingFolderMapping) {
    throw new ProjectDriveFolderConflictError(
      existingFolderMapping.project.code
    )
  }

  if (existingProject) {
    throw new ProjectCodeConflictError(existingProject.code)
  }

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        clientId: parsed.clientId,
        code,
        name: parsed.name.trim(),
        contractNumber: parsed.contractNumber?.trim() || null,
        driveProjectName: parsed.driveFolderName.trim(),
        setting: {
          create: {},
        },
        pdiRegister: {
          create: {},
        },
        driveMappings: {
          create: {
            folderType: DriveFolderType.ROOT,
            folderId: parsed.driveFolderId,
            folderName: parsed.driveFolderName.trim(),
            isActive: true,
          },
        },
      },
    })

    await tx.auditLog.create({
      data: {
        action: "project.create",
        entityType: "Project",
        entityId: project.id,
        projectId: project.id,
        clientId: parsed.clientId,
        severity: "Info",
        afterSnapshot: {
          code: project.code,
          name: project.name,
          driveFolderId: parsed.driveFolderId,
        },
      },
    })

    return project
  })
}
