import "server-only"
import { DriveFolderType } from "@prisma/client"
import { env, hasGoogleDriveServiceAccount } from "@/lib/config/env"
import { createGoogleDriveClient } from "@/lib/google/drive"
import { prisma } from "@/lib/prisma/client"

export type SharedDriveProjectFolder = {
  folderId: string
  name: string
  code: string
  modifiedTime: string | null
  webViewLink: string | null
  alreadyInitiated: boolean
  linkedProjectId: string | null
  linkedProjectCode: string | null
  linkedProjectName: string | null
}

export type SharedDriveProjectDiscoveryResult = {
  status:
    | "ready"
    | "not_configured"
    | "database_error"
    | "drive_error"
  message?: string
  sharedDriveId?: string
  projectsFolderId?: string
  scanPrefix?: string
  totalMatchingFolders: number
  availableFolders: SharedDriveProjectFolder[]
  linkedFolders: SharedDriveProjectFolder[]
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function buildProjectFolderPattern(prefix: string) {
  return new RegExp(`^${escapeRegExp(prefix)}\\d{3}(?:\\b|-)`, "i")
}

function extractProjectCode(name: string, prefix: string) {
  const pattern = new RegExp(`^(${escapeRegExp(prefix)}\\d{3})`, "i")
  return name.match(pattern)?.[1]?.toUpperCase() ?? prefix.toUpperCase()
}

export async function discoverSharedDriveProjectFolders(): Promise<SharedDriveProjectDiscoveryResult> {
  const sharedDriveId = env.GOOGLE_DRIVE_SHARED_DRIVE_ID
  const projectsFolderId =
    env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID ?? env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  const scanPrefix = env.GOOGLE_DRIVE_FOLDER_SCAN_PREFIX ?? "PRJ-"

  if (!hasGoogleDriveServiceAccount || !sharedDriveId || !projectsFolderId) {
    return {
      status: "not_configured",
      message:
        "Google Drive discovery needs the service-account credentials, shared drive ID, and projects folder ID.",
      totalMatchingFolders: 0,
      availableFolders: [],
      linkedFolders: [],
    }
  }

  const projectFolderPattern = buildProjectFolderPattern(scanPrefix)
  const linkedByFolderId = new Map<
    string,
    { projectId: string; projectCode: string; projectName: string }
  >()

  try {
    const linkedProjects = await prisma.project.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        driveMappings: {
          where: {
            folderType: DriveFolderType.ROOT,
            isActive: true,
          },
          select: {
            folderId: true,
          },
        },
      },
    })

    for (const project of linkedProjects) {
      for (const mapping of project.driveMappings) {
        linkedByFolderId.set(mapping.folderId, {
          projectId: project.id,
          projectCode: project.code,
          projectName: project.name,
        })
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error."

    return {
      status: "database_error",
      message,
      sharedDriveId,
      projectsFolderId,
      scanPrefix,
      totalMatchingFolders: 0,
      availableFolders: [],
      linkedFolders: [],
    }
  }

  try {
    const drive = createGoogleDriveClient()
    const discoveredFolders: SharedDriveProjectFolder[] = []
    let pageToken: string | undefined

    do {
      const response = await drive.files.list({
        corpora: "drive",
        driveId: sharedDriveId,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageSize: 200,
        pageToken,
        orderBy: "name_natural",
        q: `'${projectsFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields:
          "nextPageToken, files(id, name, modifiedTime, webViewLink)",
      })

      for (const file of response.data.files ?? []) {
        const folderName = file.name ?? ""

        if (!file.id || !projectFolderPattern.test(folderName)) {
          continue
        }

        const linkedProject = linkedByFolderId.get(file.id)

        discoveredFolders.push({
          folderId: file.id,
          name: folderName,
          code: extractProjectCode(folderName, scanPrefix),
          modifiedTime: file.modifiedTime ?? null,
          webViewLink: file.webViewLink ?? null,
          alreadyInitiated: Boolean(linkedProject),
          linkedProjectId: linkedProject?.projectId ?? null,
          linkedProjectCode: linkedProject?.projectCode ?? null,
          linkedProjectName: linkedProject?.projectName ?? null,
        })
      }

      pageToken = response.data.nextPageToken ?? undefined
    } while (pageToken)

    const linkedFolders = discoveredFolders.filter((folder) => folder.alreadyInitiated)
    const availableFolders = discoveredFolders.filter(
      (folder) => !folder.alreadyInitiated
    )

    return {
      status: "ready",
      sharedDriveId,
      projectsFolderId,
      scanPrefix,
      totalMatchingFolders: discoveredFolders.length,
      availableFolders,
      linkedFolders,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Google Drive error."

    return {
      status: "drive_error",
      message,
      sharedDriveId,
      projectsFolderId,
      scanPrefix,
      totalMatchingFolders: 0,
      availableFolders: [],
      linkedFolders: [],
    }
  }
}
