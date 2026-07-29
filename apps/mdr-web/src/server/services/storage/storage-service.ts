import "server-only"
import { createHash } from "node:crypto"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type UploadFileInput = {
  bucket: string
  path: string
  file: File
  upsert?: boolean
}

type UploadBytesInput = {
  bucket: string
  path: string
  bytes: Buffer | Uint8Array
  fileName: string
  mimeType?: string | null
  upsert?: boolean
}

function normalizePathSegment(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function buildStoragePath(
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

export async function uploadFileToSupabaseStorage(input: UploadFileInput) {
  const bytes = Buffer.from(await input.file.arrayBuffer())
  return uploadBytesToSupabaseStorage({
    bucket: input.bucket,
    path: input.path,
    bytes,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    upsert: input.upsert,
  })
}

export async function uploadBytesToSupabaseStorage(input: UploadBytesInput) {
  const supabase = createSupabaseAdminClient()
  const bytes = Buffer.from(input.bytes)
  const checksum = createHash("sha256").update(bytes).digest("hex")

  const { error } = await supabase.storage
    .from(input.bucket)
    .upload(input.path, bytes, {
      contentType: input.mimeType || "application/octet-stream",
      upsert: input.upsert ?? false,
    })

  if (error) {
    throw new Error(error.message)
  }

  return {
    bucket: input.bucket,
    path: input.path,
    fileName: input.fileName,
    fileSizeBytes: bytes.length,
    mimeType: input.mimeType || "application/octet-stream",
    checksum,
  }
}

export async function createSignedStorageUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 60 * 60
) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds)

  if (error) {
    throw new Error(error.message)
  }

  return data.signedUrl
}

export async function downloadFileFromSupabaseStorage(
  bucket: string,
  path: string
) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage.from(bucket).download(path)

  if (error) {
    throw new Error(error.message)
  }

  return Buffer.from(await data.arrayBuffer())
}

export async function deleteFilesFromSupabaseStorage(
  bucket: string,
  paths: string[]
) {
  if (paths.length === 0) return
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.storage.from(bucket).remove(paths)

  if (error) {
    throw new Error(error.message)
  }
}
