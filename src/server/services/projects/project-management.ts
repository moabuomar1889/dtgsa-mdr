import "server-only"
import { DriveFolderType } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"

const createProjectSchema = z.object({
  clientId: z.string().trim().min(1),
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(180),
  contractNumber: z.string().trim().max(100).optional(),
  driveFolderId: z.string().trim().min(1),
  driveFolderName: z.string().trim().min(2).max(255),
})

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
  const parsed = createProjectSchema.parse(input)
  const code = normalizeProjectCode(parsed.code)

  const existingFolderMapping = await prisma.driveMapping.findFirst({
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
  })

  if (existingFolderMapping) {
    throw new Error(
      `That Google Drive folder is already linked to project ${existingFolderMapping.project.code}.`
    )
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
