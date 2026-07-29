import "server-only"
import { createHash } from "node:crypto"
import { Readable } from "node:stream"
import { StorageProvider } from "@prisma/client"
import type { DriveStorageAdapter } from "@dtg/controlled-storage-domain"
import { env } from "@/lib/config/env"
import {
  createControlledDriveAdapter,
  createSourceDriveAdapter,
  createTemporaryArtifactAdapter,
} from "@/server/services/local/local-provider-factory"

type UploadFileInput = {
  area: StorageArea
  providerKeyHint: string
  file: File
}

type UploadBytesInput = {
  area: StorageArea
  providerKeyHint: string
  bytes: Buffer | Uint8Array
  fileName: string
  mimeType?: string | null
}

export type StorageArea = "source" | "controlled" | "temporary"

function normalizePathSegment(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function buildStorageKey(
  ...segments: Array<string | number | null | undefined>
) {
  return segments
    .filter(
      (segment): segment is string | number =>
        segment !== null && typeof segment !== "undefined"
    )
    .map((segment) => normalizePathSegment(String(segment)))
    .filter(Boolean)
    .join("/")
}

function isLocalAcceptance() {
  return process.env.LOCAL_ACCEPTANCE_MODE === "true"
}

export function storageProviderForArea(area: StorageArea): StorageProvider {
  if (isLocalAcceptance()) {
    if (area === "source") return StorageProvider.LOCAL_SOURCE_FILESYSTEM
    if (area === "controlled") {
      return StorageProvider.LOCAL_CONTROLLED_FILESYSTEM
    }
    return StorageProvider.LOCAL_TEMPORARY_ARTIFACT
  }
  return area === "source"
    ? StorageProvider.GOOGLE_DRIVE_SOURCE
    : StorageProvider.GOOGLE_DRIVE_CONTROLLED
}

function adapterForArea(area: StorageArea): DriveStorageAdapter {
  if (area === "source") return createSourceDriveAdapter()
  if (area === "controlled") return createControlledDriveAdapter()
  return createTemporaryArtifactAdapter()
}

function folderForArea(area: StorageArea) {
  if (isLocalAcceptance()) return `local-${area}-root`
  const folder =
    area === "source"
      ? env.GOOGLE_DRIVE_PROJECTS_FOLDER_ID ?? env.GOOGLE_DRIVE_ROOT_FOLDER_ID
      : env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (!folder) {
    throw new Error(`Storage root for ${area} files is not configured.`)
  }
  return folder
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

export async function uploadFileToStorage(input: UploadFileInput) {
  const bytes = Buffer.from(await input.file.arrayBuffer())
  return uploadBytesToStorage({
    area: input.area,
    providerKeyHint: input.providerKeyHint,
    bytes,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
  })
}

export async function uploadBytesToStorage(input: UploadBytesInput) {
  const bytes = Buffer.from(input.bytes)
  const checksum = createHash("sha256").update(bytes).digest("hex")
  const mimeType = input.mimeType || "application/octet-stream"
  const uploaded = await adapterForArea(input.area).uploadResumable({
    folderId: folderForArea(input.area),
    opaqueName: input.providerKeyHint.replaceAll("/", "--"),
    mimeType,
    bytes: Readable.from(bytes),
  })

  return {
    storageProvider: storageProviderForArea(input.area),
    providerKey: uploaded.fileId,
    fileName: input.fileName,
    fileSizeBytes: bytes.length,
    mimeType,
    checksum,
  }
}

export async function downloadFileFromStorage(
  provider: StorageProvider,
  providerKey: string
) {
  const area: StorageArea =
    provider === StorageProvider.GOOGLE_DRIVE_SOURCE ||
    provider === StorageProvider.LOCAL_SOURCE_FILESYSTEM
      ? "source"
      : provider === StorageProvider.LOCAL_TEMPORARY_ARTIFACT
        ? "temporary"
        : "controlled"
  return streamToBuffer(await adapterForArea(area).read(providerKey))
}

export async function deleteFilesFromStorage(
  provider: StorageProvider,
  providerKeys: string[]
) {
  if (providerKeys.length === 0) return
  const area: StorageArea =
    provider === StorageProvider.GOOGLE_DRIVE_SOURCE ||
    provider === StorageProvider.LOCAL_SOURCE_FILESYSTEM
      ? "source"
      : provider === StorageProvider.LOCAL_TEMPORARY_ARTIFACT
        ? "temporary"
        : "controlled"
  const adapter = adapterForArea(area)
  for (const providerKey of providerKeys) {
    await adapter.deleteTemporary(providerKey)
  }
}
