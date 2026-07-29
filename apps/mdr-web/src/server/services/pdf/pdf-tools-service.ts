import "server-only"
import {
  mergePdfBuffers,
  removePdfPages,
  reorderPdfPages,
  rotatePdfPages,
  splitPdfBuffer,
  stampPdfWithText,
} from "@/lib/pdf/toolkit"
import {
  buildStorageKey,
  downloadFileFromStorage,
  storageProviderForArea,
  uploadBytesToStorage,
} from "@/server/services/storage/storage-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

type PdfToolManifestEntry = {
  label: string
  fileName: string
  providerKey: string
  mimeType: string
}

type PdfToolManifest = {
  createdAt: string
  operation: string
  entries: PdfToolManifestEntry[]
}

function ensurePdfFile(file: File | null, label: string) {
  if (!file || file.size === 0) {
    throw new Error(`${label} is required.`)
  }

  const fileName = file.name.toLowerCase()
  const isPdf =
    file.type === "application/pdf" || fileName.endsWith(".pdf")

  if (!isPdf) {
    throw new Error(`${label} must be a PDF file.`)
  }

  return file
}

function parsePageIndexes(input: string, { allowEmpty = false } = {}) {
  const trimmed = input.trim()

  if (!trimmed) {
    if (allowEmpty) {
      return []
    }

    throw new Error("A page list is required.")
  }

  const indexes = trimmed
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => value - 1)

  if (indexes.length === 0 && !allowEmpty) {
    throw new Error("Page lists must contain 1-based page numbers.")
  }

  return indexes
}

async function storePdfToolOutputs(input: {
  user: CurrentAppUser
  operation: string
  outputs: Array<{
    label: string
    fileName: string
    bytes: Buffer | Uint8Array
    mimeType?: string
  }>
}) {
  const stamp = Date.now().toString()
  const prefix = buildStorageKey("pdf-tools", input.user.id, stamp, input.operation)

  const entries = await Promise.all(
    input.outputs.map(async (output, index) => {
      const upload = await uploadBytesToStorage({
        area: "temporary",
        providerKeyHint: buildStorageKey(
          prefix,
          `${index + 1}-${output.fileName}`
        ),
        bytes: output.bytes,
        fileName: output.fileName,
        mimeType: output.mimeType ?? "application/pdf",
      })

      return {
        label: output.label,
        fileName: upload.fileName,
        providerKey: upload.providerKey,
        mimeType: upload.mimeType,
      }
    })
  )

  const manifest: PdfToolManifest = {
    createdAt: new Date().toISOString(),
    operation: input.operation,
    entries,
  }

  const manifestUpload = await uploadBytesToStorage({
    area: "temporary",
    providerKeyHint: buildStorageKey(prefix, "manifest.json"),
    bytes: Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
    fileName: "manifest.json",
    mimeType: "application/json",
  })

  return manifestUpload.providerKey
}

export async function getPdfToolResult(manifestPath: string | null | undefined) {
  if (!manifestPath) {
    return null
  }

  const bytes = await downloadFileFromStorage(
    storageProviderForArea("temporary"),
    manifestPath
  ).catch(() => null)

  if (!bytes) {
    return null
  }

  const manifest = JSON.parse(bytes.toString("utf8")) as PdfToolManifest

  return {
    ...manifest,
    entries: await Promise.all(
      manifest.entries.map(async (entry) => ({
        ...entry,
        url: `/api/pdf-tools/download?key=${encodeURIComponent(entry.providerKey)}`,
      }))
    ),
  }
}

export async function runPdfMergeTool(user: CurrentAppUser, files: File[]) {
  if (files.length < 2) {
    throw new Error("At least two PDF files are required for merge.")
  }

  const buffers = await Promise.all(
    files.map(async (file, index) =>
      Buffer.from(await ensurePdfFile(file, `PDF ${index + 1}`).arrayBuffer())
    )
  )
  const merged = await mergePdfBuffers(buffers)

  return storePdfToolOutputs({
    user,
    operation: "merge",
    outputs: [
      {
        label: "Merged PDF",
        fileName: "merged.pdf",
        bytes: merged,
      },
    ],
  })
}

export async function runPdfSplitTool(user: CurrentAppUser, file: File) {
  const source = ensurePdfFile(file, "PDF file")
  const pages = await splitPdfBuffer(Buffer.from(await source.arrayBuffer()))

  return storePdfToolOutputs({
    user,
    operation: "split",
    outputs: pages.map((page, index) => ({
      label: `Page ${index + 1}`,
      fileName: `page-${index + 1}.pdf`,
      bytes: page,
    })),
  })
}

export async function runPdfRemovePagesTool(
  user: CurrentAppUser,
  file: File,
  pages: string
) {
  const source = ensurePdfFile(file, "PDF file")
  const result = await removePdfPages(
    Buffer.from(await source.arrayBuffer()),
    parsePageIndexes(pages)
  )

  return storePdfToolOutputs({
    user,
    operation: "remove-pages",
    outputs: [
      {
        label: "Updated PDF",
        fileName: "removed-pages.pdf",
        bytes: result,
      },
    ],
  })
}

export async function runPdfReorderTool(
  user: CurrentAppUser,
  file: File,
  order: string
) {
  const source = ensurePdfFile(file, "PDF file")
  const result = await reorderPdfPages(
    Buffer.from(await source.arrayBuffer()),
    parsePageIndexes(order)
  )

  return storePdfToolOutputs({
    user,
    operation: "reorder",
    outputs: [
      {
        label: "Reordered PDF",
        fileName: "reordered.pdf",
        bytes: result,
      },
    ],
  })
}

export async function runPdfRotateTool(input: {
  user: CurrentAppUser
  file: File
  pages: string
  degreesValue: 90 | 180 | 270
}) {
  const source = ensurePdfFile(input.file, "PDF file")
  const result = await rotatePdfPages(
    Buffer.from(await source.arrayBuffer()),
    parsePageIndexes(input.pages).map((pageIndex) => ({
      pageIndex,
      degreesValue: input.degreesValue,
    }))
  )

  return storePdfToolOutputs({
    user: input.user,
    operation: "rotate",
    outputs: [
      {
        label: "Rotated PDF",
        fileName: "rotated.pdf",
        bytes: result,
      },
    ],
  })
}

export async function runPdfStampTool(input: {
  user: CurrentAppUser
  file: File
  text: string
  page?: string
  x?: string
  y?: string
  size?: string
}) {
  const source = ensurePdfFile(input.file, "PDF file")
  const pageIndex = input.page ? Math.max(0, Number(input.page) - 1) : 0
  const x = input.x ? Number(input.x) : undefined
  const y = input.y ? Number(input.y) : undefined
  const size = input.size ? Number(input.size) : undefined

  const result = await stampPdfWithText(Buffer.from(await source.arrayBuffer()), {
    text: input.text.trim(),
    pageIndex,
    x: Number.isFinite(x) ? x : undefined,
    y: Number.isFinite(y) ? y : undefined,
    size: Number.isFinite(size) ? size : undefined,
  })

  return storePdfToolOutputs({
    user: input.user,
    operation: "stamp",
    outputs: [
      {
        label: "Stamped PDF",
        fileName: "stamped.pdf",
        bytes: result,
      },
    ],
  })
}
