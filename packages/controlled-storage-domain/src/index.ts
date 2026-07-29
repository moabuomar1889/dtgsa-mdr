import { createHash, randomBytes } from "node:crypto"
import { Readable } from "node:stream"

export type DriveFileMetadata = {
  fileId: string
  driveId?: string
  name: string
  mimeType: string
  sizeBytes: number
  parents: string[]
  owners: string[]
  trashed: boolean
  modifiedTime?: Date
  md5Checksum?: string
}

export type DrivePermission = {
  id: string
  type: "user" | "group" | "domain" | "anyone"
  role: string
  emailAddress?: string
}

export interface DriveStorageAdapter {
  getMetadata(fileId: string): Promise<DriveFileMetadata | null>
  read(
    fileId: string,
    range?: { start: number; end: number }
  ): Promise<Readable>
  copy(input: {
    sourceFileId: string
    destinationFolderId: string
    opaqueName: string
  }): Promise<DriveFileMetadata>
  createFolder(input: {
    name: string
    parentId: string
    driveId?: string
  }): Promise<{ id: string; driveId?: string }>
  listPermissions(fileId: string): Promise<DrivePermission[]>
  removePermission(fileId: string, permissionId: string): Promise<void>
  applyRestrictedPermissions(
    fileId: string,
    allowedPrincipals: readonly string[]
  ): Promise<void>
  move(fileId: string, destinationFolderId: string): Promise<void>
  uploadResumable(input: {
    folderId: string
    opaqueName: string
    mimeType: string
    bytes: Readable
  }): Promise<DriveFileMetadata>
  deleteTemporary(fileId: string): Promise<void>
}

export const CONTROLLED_PDF_MIME = "application/pdf"

export function sha256(bytes: Buffer | Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex")
}

export function validatePickerMetadata(
  metadata: DriveFileMetadata | null,
  input: {
    allowedDriveIds: readonly string[]
    maxSizeBytes: number
    requirePdf?: boolean
  }
) {
  if (!metadata || metadata.trashed) {
    throw new Error("Selected Drive file is missing or trashed.")
  }
  if (input.requirePdf !== false && metadata.mimeType !== CONTROLLED_PDF_MIME) {
    throw new Error("Controlled Main File must be a PDF.")
  }
  if (metadata.sizeBytes <= 0 || metadata.sizeBytes > input.maxSizeBytes) {
    throw new Error("Selected Drive file size is not allowed.")
  }
  if (
    input.allowedDriveIds.length > 0 &&
    (!metadata.driveId || !input.allowedDriveIds.includes(metadata.driveId))
  ) {
    throw new Error("Selected Drive file is outside an authorized location.")
  }
  return metadata
}

export function opaqueControlledFileName(extension = "pdf") {
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "")
  return `${randomBytes(24).toString("hex")}.${safeExtension || "bin"}`
}

export function computeFolderRoute(
  template: readonly string[],
  values: Record<string, string | number>
) {
  return template.map((token) => {
    const value = String(values[token] ?? "").trim()
    if (!value) throw new Error(`Folder route token ${token} is missing.`)
    return value.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
  })
}

export function permissionFingerprint(permissions: readonly DrivePermission[]) {
  return sha256(
    JSON.stringify(
      [...permissions]
        .map((permission) => ({
          type: permission.type,
          role: permission.role,
          emailAddress: permission.emailAddress,
        }))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    )
  )
}

export function unauthorizedPermissions(
  permissions: readonly DrivePermission[],
  allowedPrincipals: readonly string[]
) {
  return permissions.filter(
    (permission) =>
      permission.type === "anyone" ||
      permission.type === "domain" ||
      (permission.emailAddress &&
        !allowedPrincipals.includes(permission.emailAddress.toLowerCase()))
  )
}

export function parseByteRange(
  header: string | null,
  sizeBytes: number
): { start: number; end: number } | null {
  if (!header) return null
  const match = /^bytes=(\d+)-(\d*)$/.exec(header)
  if (!match) throw new Error("Requested byte range is invalid.")
  const start = Number(match[1])
  const end = match[2] ? Number(match[2]) : sizeBytes - 1
  if (start < 0 || end < start || end >= sizeBytes) {
    throw new Error("Requested byte range is outside the file.")
  }
  return { start, end }
}

export function secureFileHeaders(input: {
  fileName: string
  mimeType: string
  sizeBytes: number
  range?: { start: number; end: number } | null
}) {
  const headers: Record<string, string> = {
    "Content-Type": input.mimeType,
    "Content-Disposition": `attachment; filename="${input.fileName.replaceAll('"', "")}"`,
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  }
  if (input.range) {
    headers["Content-Range"] =
      `bytes ${input.range.start}-${input.range.end}/${input.sizeBytes}`
    headers["Content-Length"] = String(input.range.end - input.range.start + 1)
  } else {
    headers["Content-Length"] = String(input.sizeBytes)
  }
  return headers
}

export class FakeDriveStorageAdapter implements DriveStorageAdapter {
  readonly files = new Map<
    string,
    {
      metadata: DriveFileMetadata
      bytes: Buffer
      permissions: DrivePermission[]
    }
  >()
  readonly calls: string[] = []

  seed(
    metadata: DriveFileMetadata,
    bytes: Buffer,
    permissions: DrivePermission[] = []
  ) {
    this.files.set(metadata.fileId, { metadata, bytes, permissions })
  }

  async getMetadata(fileId: string) {
    this.calls.push(`metadata:${fileId}`)
    return this.files.get(fileId)?.metadata ?? null
  }

  async read(fileId: string, range?: { start: number; end: number }) {
    this.calls.push(`read:${fileId}`)
    const file = this.files.get(fileId)
    if (!file) throw new Error("Drive file not found.")
    return Readable.from(
      range ? file.bytes.subarray(range.start, range.end + 1) : file.bytes
    )
  }

  async copy(input: {
    sourceFileId: string
    destinationFolderId: string
    opaqueName: string
  }) {
    this.calls.push(`copy:${input.sourceFileId}`)
    const source = this.files.get(input.sourceFileId)
    if (!source) throw new Error("Drive source file not found.")
    const fileId = `controlled-${this.files.size + 1}`
    const metadata = {
      ...source.metadata,
      fileId,
      name: input.opaqueName,
      parents: [input.destinationFolderId],
    }
    this.seed(metadata, Buffer.from(source.bytes))
    return metadata
  }

  async createFolder(input: {
    name: string
    parentId: string
    driveId?: string
  }) {
    this.calls.push(`folder:${input.name}`)
    return { id: `folder-${this.calls.length}`, driveId: input.driveId }
  }

  async listPermissions(fileId: string) {
    return this.files.get(fileId)?.permissions ?? []
  }

  async removePermission(fileId: string, permissionId: string) {
    const file = this.files.get(fileId)
    if (file) {
      file.permissions = file.permissions.filter(
        ({ id }) => id !== permissionId
      )
    }
  }

  async applyRestrictedPermissions(
    fileId: string,
    allowedPrincipals: readonly string[]
  ) {
    const file = this.files.get(fileId)
    if (!file) throw new Error("Drive file not found.")
    file.permissions = allowedPrincipals.map((emailAddress, index) => ({
      id: `allowed-${index}`,
      type: "user",
      role: "reader",
      emailAddress: emailAddress.toLowerCase(),
    }))
  }

  async move(fileId: string, destinationFolderId: string) {
    const file = this.files.get(fileId)
    if (!file) throw new Error("Drive file not found.")
    file.metadata.parents = [destinationFolderId]
  }

  async uploadResumable(input: {
    folderId: string
    opaqueName: string
    mimeType: string
    bytes: Readable
  }) {
    const chunks: Buffer[] = []
    for await (const chunk of input.bytes) chunks.push(Buffer.from(chunk))
    const bytes = Buffer.concat(chunks)
    const fileId = `upload-${this.files.size + 1}`
    const metadata: DriveFileMetadata = {
      fileId,
      name: input.opaqueName,
      mimeType: input.mimeType,
      sizeBytes: bytes.length,
      parents: [input.folderId],
      owners: [],
      trashed: false,
    }
    this.seed(metadata, bytes)
    return metadata
  }

  async deleteTemporary(fileId: string) {
    this.files.delete(fileId)
  }
}
