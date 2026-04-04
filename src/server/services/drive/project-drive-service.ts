import "server-only"
import { Readable } from "node:stream"
import { DriveFolderType, SystemSeverity } from "@prisma/client"
import { env, hasGoogleDriveServiceAccount } from "@/lib/config/env"
import { createGoogleDriveClient } from "@/lib/google/drive"
import { prisma } from "@/lib/prisma/client"

const STANDARD_FOLDER_MAP: Array<{
  folderType: DriveFolderType
  folderName: string
  parentType: DriveFolderType
}> = [
  {
    folderType: DriveFolderType.DOCUMENT_CONTROL,
    folderName: "Document Control",
    parentType: DriveFolderType.ROOT,
  },
  {
    folderType: DriveFolderType.PDI,
    folderName: "PDI",
    parentType: DriveFolderType.DOCUMENT_CONTROL,
  },
  {
    folderType: DriveFolderType.MDR,
    folderName: "MDR",
    parentType: DriveFolderType.DOCUMENT_CONTROL,
  },
  {
    folderType: DriveFolderType.SUBMITTED,
    folderName: "Submitted",
    parentType: DriveFolderType.DOCUMENT_CONTROL,
  },
  {
    folderType: DriveFolderType.RECEIVED,
    folderName: "Received",
    parentType: DriveFolderType.DOCUMENT_CONTROL,
  },
  {
    folderType: DriveFolderType.REJECTED,
    folderName: "Rejected",
    parentType: DriveFolderType.DOCUMENT_CONTROL,
  },
  {
    folderType: DriveFolderType.TRANSMITTALS,
    folderName: "Transmittals",
    parentType: DriveFolderType.DOCUMENT_CONTROL,
  },
  {
    folderType: DriveFolderType.REVISIONS,
    folderName: "Revisions",
    parentType: DriveFolderType.DOCUMENT_CONTROL,
  },
]

function extractGoogleErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "error" in error.response.data
  ) {
    const payload = error.response.data as {
      error?: { message?: string } | string
    }

    if (typeof payload.error === "string") {
      return payload.error
    }

    return payload.error?.message ?? "Unknown Google Drive error."
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Unknown Google Drive error."
}

function createDriveClients() {
  if (!hasGoogleDriveServiceAccount) {
    return []
  }

  const modes: Array<{ impersonateUser?: string | null }> = env.GOOGLE_DRIVE_IMPERSONATE_USER
    ? [
        {
          impersonateUser: env.GOOGLE_DRIVE_IMPERSONATE_USER,
        },
        {
          impersonateUser: null,
        },
      ]
    : [{ impersonateUser: null }]

  return modes.map((mode) =>
    createGoogleDriveClient({
      impersonateUser: mode.impersonateUser,
      scopes: ["https://www.googleapis.com/auth/drive"],
    })
  )
}

async function getProjectRootFolder(projectId: string) {
  return prisma.driveMapping.findUnique({
    where: {
      projectId_folderType: {
        projectId,
        folderType: DriveFolderType.ROOT,
      },
    },
  })
}

async function createOrFindChildFolder(input: {
  projectId: string
  folderType: DriveFolderType
  folderName: string
  parentFolderId: string
}) {
  const existing = await prisma.driveMapping.findUnique({
    where: {
      projectId_folderType: {
        projectId: input.projectId,
        folderType: input.folderType,
      },
    },
  })

  if (existing) {
    return existing
  }

  if (!hasGoogleDriveServiceAccount) {
    throw new Error("Google Drive service account credentials are not configured.")
  }

  const clients = createDriveClients()
  let lastError = "No Google Drive client available."

  for (const drive of clients) {
    try {
      const response = await drive.files.create({
        supportsAllDrives: true,
        requestBody: {
          name: input.folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [input.parentFolderId],
        },
        fields: "id,name,parents",
      })

      if (!response.data.id) {
        throw new Error("Google Drive did not return a folder ID.")
      }

      return prisma.driveMapping.create({
        data: {
          projectId: input.projectId,
          folderType: input.folderType,
          folderId: response.data.id,
          folderName: response.data.name ?? input.folderName,
          parentFolderId: input.parentFolderId,
          isActive: true,
        },
      })
    } catch (error) {
      lastError = extractGoogleErrorMessage(error)
    }
  }

  throw new Error(lastError)
}

export async function ensureProjectDriveFolderMappings(projectId: string) {
  const root = await getProjectRootFolder(projectId)

  if (!root) {
    throw new Error("Project root folder mapping is missing.")
  }

  const ensuredMappings = new Map<DriveFolderType, string>([[DriveFolderType.ROOT, root.folderId]])

  for (const definition of STANDARD_FOLDER_MAP) {
    const parentFolderId = ensuredMappings.get(definition.parentType)

    if (!parentFolderId) {
      throw new Error(`Parent folder mapping ${definition.parentType} is missing.`)
    }

    const mapping = await createOrFindChildFolder({
      projectId,
      folderType: definition.folderType,
      folderName: definition.folderName,
      parentFolderId,
    })

    ensuredMappings.set(definition.folderType, mapping.folderId)
  }

  return ensuredMappings
}

export async function uploadProjectFileToGoogleDrive(input: {
  projectId: string
  folderType: DriveFolderType
  fileName: string
  bytes: Buffer
  mimeType: string
  actorUserId?: string | null
}) {
  if (!hasGoogleDriveServiceAccount) {
    return null
  }

  try {
    const mappings = await ensureProjectDriveFolderMappings(input.projectId)
    const folderId = mappings.get(input.folderType)

    if (!folderId) {
      throw new Error(`Drive folder mapping ${input.folderType} is missing.`)
    }

    let lastError = "No Google Drive client available."

    for (const drive of createDriveClients()) {
      try {
        const response = await drive.files.create({
          supportsAllDrives: true,
          requestBody: {
            name: input.fileName,
            parents: [folderId],
          },
          media: {
            mimeType: input.mimeType,
            body: Readable.from(input.bytes),
          },
          fields: "id,name,webViewLink",
        })

        if (!response.data.id) {
          throw new Error("Google Drive did not return a file ID.")
        }

        return {
          fileId: response.data.id,
          folderId,
          webViewLink: response.data.webViewLink ?? null,
        }
      } catch (error) {
        lastError = extractGoogleErrorMessage(error)
      }
    }

    throw new Error(lastError)
  } catch (error) {
    await prisma.systemLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        source: "google_drive",
        action: "upload.failed",
        message:
          error instanceof Error ? error.message : "Unknown Google Drive upload error.",
        projectId: input.projectId,
        severity: SystemSeverity.Warning,
        metadata: {
          folderType: input.folderType,
          fileName: input.fileName,
        },
      },
    })

    return null
  }
}
