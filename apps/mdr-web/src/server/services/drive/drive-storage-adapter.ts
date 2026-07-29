import "server-only"
import { Readable } from "node:stream"
import type {
  DriveFileMetadata,
  DrivePermission,
  DriveStorageAdapter,
} from "@dtg/controlled-storage-domain"
import { createGoogleDriveClient } from "@/lib/google/drive"

export class GoogleDriveStorageAdapter implements DriveStorageAdapter {
  private readonly drive = createGoogleDriveClient({
    scopes: ["https://www.googleapis.com/auth/drive"],
  })

  async getMetadata(fileId: string): Promise<DriveFileMetadata | null> {
    try {
      const response = await this.drive.files.get({
        fileId,
        supportsAllDrives: true,
        fields:
          "id,driveId,name,mimeType,size,parents,owners(emailAddress),trashed,modifiedTime,md5Checksum",
      })
      const file = response.data
      if (!file.id || !file.name || !file.mimeType) return null
      return {
        fileId: file.id,
        driveId: file.driveId ?? undefined,
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: Number(file.size ?? 0),
        parents: file.parents ?? [],
        owners: (file.owners ?? [])
          .map((owner) => owner.emailAddress)
          .filter((email): email is string => Boolean(email)),
        trashed: file.trashed ?? false,
        modifiedTime: file.modifiedTime
          ? new Date(file.modifiedTime)
          : undefined,
        md5Checksum: file.md5Checksum ?? undefined,
      }
    } catch {
      return null
    }
  }

  async read(fileId: string, range?: { start: number; end: number }) {
    const response = await this.drive.files.get(
      {
        fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      {
        responseType: "stream",
        headers: range
          ? { Range: `bytes=${range.start}-${range.end}` }
          : undefined,
      }
    )
    return response.data as Readable
  }

  async copy(input: {
    sourceFileId: string
    destinationFolderId: string
    opaqueName: string
  }) {
    const copied = await this.drive.files.copy({
      fileId: input.sourceFileId,
      supportsAllDrives: true,
      requestBody: {
        name: input.opaqueName,
        parents: [input.destinationFolderId],
      },
      fields:
        "id,driveId,name,mimeType,size,parents,owners(emailAddress),trashed,modifiedTime,md5Checksum",
    })
    if (!copied.data.id) throw new Error("Drive copy did not return a File ID.")
    const metadata = await this.getMetadata(copied.data.id)
    if (!metadata) throw new Error("Controlled Drive copy metadata is missing.")
    return metadata
  }

  async createFolder(input: {
    name: string
    parentId: string
    driveId?: string
  }) {
    const response = await this.drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: input.name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [input.parentId],
      },
      fields: "id,driveId",
    })
    if (!response.data.id) throw new Error("Drive folder ID is missing.")
    return {
      id: response.data.id,
      driveId: response.data.driveId ?? input.driveId,
    }
  }

  async listPermissions(fileId: string): Promise<DrivePermission[]> {
    const response = await this.drive.permissions.list({
      fileId,
      supportsAllDrives: true,
      fields: "permissions(id,type,role,emailAddress)",
    })
    return (response.data.permissions ?? [])
      .filter(
        (permission) =>
          permission.id &&
          permission.type &&
          permission.role &&
          ["user", "group", "domain", "anyone"].includes(permission.type)
      )
      .map((permission) => ({
        id: permission.id!,
        type: permission.type as DrivePermission["type"],
        role: permission.role!,
        emailAddress: permission.emailAddress ?? undefined,
      }))
  }

  async removePermission(fileId: string, permissionId: string) {
    await this.drive.permissions.delete({
      fileId,
      permissionId,
      supportsAllDrives: true,
    })
  }

  async applyRestrictedPermissions(
    fileId: string,
    allowedPrincipals: readonly string[]
  ) {
    for (const emailAddress of allowedPrincipals) {
      await this.drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        sendNotificationEmail: false,
        requestBody: { type: "user", role: "reader", emailAddress },
      })
    }
  }

  async move(fileId: string, destinationFolderId: string) {
    const metadata = await this.getMetadata(fileId)
    await this.drive.files.update({
      fileId,
      supportsAllDrives: true,
      addParents: destinationFolderId,
      removeParents: metadata?.parents.join(","),
      fields: "id",
    })
  }

  async uploadResumable(input: {
    folderId: string
    opaqueName: string
    mimeType: string
    bytes: Readable
  }) {
    const response = await this.drive.files.create({
      supportsAllDrives: true,
      uploadType: "resumable",
      requestBody: { name: input.opaqueName, parents: [input.folderId] },
      media: { mimeType: input.mimeType, body: input.bytes },
      fields: "id",
    })
    if (!response.data.id) throw new Error("Drive upload File ID is missing.")
    const metadata = await this.getMetadata(response.data.id)
    if (!metadata) throw new Error("Uploaded Drive metadata is missing.")
    return metadata
  }

  async deleteTemporary(fileId: string) {
    await this.drive.files.delete({ fileId, supportsAllDrives: true })
  }
}
