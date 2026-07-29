import "server-only"
import { Readable } from "node:stream"
import {
  opaqueControlledFileName,
  sha256,
  type DriveStorageAdapter,
} from "@dtg/controlled-storage-domain"
import { prisma } from "@/lib/prisma/client"
import {
  buildStorageKey,
  deleteFilesFromStorage,
  downloadFileFromStorage,
  storageProviderForArea,
  uploadBytesToStorage,
} from "@/server/services/storage/storage-service"
import { issueOpaqueToken } from "@dtg/identity-domain"

export interface MalwareScanAdapter {
  scan(bytes: Buffer): Promise<{ clean: boolean; provider: string }>
}

export class FakeMalwareScanAdapter implements MalwareScanAdapter {
  constructor(private readonly clean = true) {}
  async scan() {
    return { clean: this.clean, provider: "deterministic-fake" }
  }
}

export async function createResumableUpload(input: {
  userId: string
  projectId?: string
  fileName: string
  mimeType: string
  expectedSizeBytes: number
  expectedHash?: string
  idempotencyKey: string
}) {
  const existing = await prisma.uploadSession.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  })
  if (existing) return existing
  return prisma.uploadSession.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      expectedSizeBytes: BigInt(input.expectedSizeBytes),
      expectedHash: input.expectedHash,
      uploadKey: issueOpaqueToken(),
      idempotencyKey: input.idempotencyKey,
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    },
  })
}

export async function acceptUploadPart(input: {
  uploadKey: string
  partNumber: number
  offsetBytes: number
  bytes: Buffer
  checksum: string
}) {
  const session = await prisma.uploadSession.findUnique({
    where: { uploadKey: input.uploadKey },
  })
  if (!session || session.expiresAt <= new Date()) {
    throw new Error("Upload session is invalid or expired.")
  }
  if (sha256(input.bytes) !== input.checksum) {
    throw new Error("Upload part checksum mismatch.")
  }
  const existing = await prisma.uploadSessionPart.findUnique({
    where: {
      uploadSessionId_partNumber: {
        uploadSessionId: session.id,
        partNumber: input.partNumber,
      },
    },
  })
  if (existing) {
    if (
      existing.checksum !== input.checksum ||
      existing.offsetBytes !== BigInt(input.offsetBytes)
    ) {
      throw new Error("Upload part conflicts with an existing part.")
    }
    return existing
  }
  const providerKeyHint = buildStorageKey(
    "resumable",
    session.id,
    `${input.partNumber}.part`
  )
  const uploaded = await uploadBytesToStorage({
    area: "temporary",
    providerKeyHint,
    bytes: input.bytes,
    fileName: `${input.partNumber}.part`,
  })
  return prisma.$transaction(async (tx) => {
    const part = await tx.uploadSessionPart.create({
      data: {
        uploadSessionId: session.id,
        partNumber: input.partNumber,
        offsetBytes: BigInt(input.offsetBytes),
        sizeBytes: input.bytes.length,
        checksum: input.checksum,
        providerKey: uploaded.providerKey,
      },
    })
    await tx.uploadSession.update({
      where: { id: session.id },
      data: {
        status: "Uploading",
        receivedBytes: { increment: BigInt(input.bytes.length) },
      },
    })
    return part
  })
}

export async function completeResumableUpload(input: {
  uploadKey: string
  destinationFolderId: string
  adapter: DriveStorageAdapter
  malwareScanner: MalwareScanAdapter
}) {
  const session = await prisma.uploadSession.findUnique({
    where: { uploadKey: input.uploadKey },
    include: { parts: { orderBy: { offsetBytes: "asc" } } },
  })
  if (!session) throw new Error("Upload session was not found.")
  if (session.status === "Completed" && session.fileObjectId) return session
  let expectedOffset = 0
  const chunks: Buffer[] = []
  for (const part of session.parts) {
    if (Number(part.offsetBytes) !== expectedOffset) {
      throw new Error("Upload parts are not contiguous.")
    }
    const bytes = await downloadFileFromStorage(
      storageProviderForArea("temporary"),
      part.providerKey
    )
    if (sha256(bytes) !== part.checksum || bytes.length !== part.sizeBytes) {
      throw new Error("Stored upload part failed validation.")
    }
    chunks.push(bytes)
    expectedOffset += bytes.length
  }
  const bytes = Buffer.concat(chunks)
  if (
    session.expectedSizeBytes !== null &&
    BigInt(bytes.length) !== session.expectedSizeBytes
  ) {
    throw new Error("Completed upload size mismatch.")
  }
  const checksum = sha256(bytes)
  if (session.expectedHash && checksum !== session.expectedHash) {
    throw new Error("Completed upload checksum mismatch.")
  }
  const malware = await input.malwareScanner.scan(bytes)
  if (!malware.clean) throw new Error("Upload failed malware scanning.")
  const uploaded = await input.adapter.uploadResumable({
    folderId: input.destinationFolderId,
    opaqueName: opaqueControlledFileName(
      session.fileName.split(".").pop() ?? "bin"
    ),
    mimeType: session.mimeType,
    bytes: Readable.from(bytes),
  })
  const completed = await prisma.$transaction(async (tx) => {
    const file = await tx.fileObject.create({
      data: {
        storageProvider: storageProviderForArea("controlled"),
        providerKey: uploaded.fileId,
        fileName: session.fileName,
        mimeType: session.mimeType,
        sizeBytes: BigInt(bytes.length),
        checksum,
        driveIdentity: {
          create: {
            driveFileId: uploaded.fileId,
            sharedDriveId: uploaded.driveId,
            parentFolderId: uploaded.parents[0],
            nameSnapshot: uploaded.name,
          },
        },
      },
    })
    return tx.uploadSession.update({
      where: { id: session.id },
      data: {
        status: "Completed",
        completedAt: new Date(),
        fileObjectId: file.id,
      },
    })
  })
  await deleteFilesFromStorage(
    storageProviderForArea("temporary"),
    session.parts.map((part) => part.providerKey)
  )
  return completed
}
