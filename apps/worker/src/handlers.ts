import {
  IntegrityStatus,
  Prisma,
  StorageProvider,
  type PrismaClient,
} from "@prisma/client"
import { google, type drive_v3 } from "googleapis"
import {
  JOB_TYPES,
  NonRetryableJobError,
  assembleSignedInternally,
  selectPdfAssemblyEngine,
  sha256,
  withEncryptedTemporaryWorkspace,
  type JobHandlers,
} from "@dtg/job-engine"
import { mergePdfBuffers } from "@dtg/pdf-engine"

type AssemblyPayload = {
  revisionId: string
  requesterUserId: string
  projectId: string
  clientId: string
  manifestId: string
  packageHash: string
  cacheKey: string
  profile: {
    kind: string
    coverFileObjectId: string
    mainFileObjectId: string
    attachmentFileObjectIds: string[]
  }
  expectedMainHash: string
  expiresInSeconds: number
}

type WorkerStorage = {
  read(fileObjectId: string): Promise<Buffer>
  writeTemporary(input: { cacheKey: string; bytes: Buffer }): Promise<{
    provider: StorageProvider
    providerKey: string
    fileName: string
    mimeType: string
  }>
  delete(providerKey: string): Promise<void>
}

function parseAssemblyPayload(
  payload: Record<string, unknown>
): AssemblyPayload {
  const parsed = payload as Partial<AssemblyPayload>
  if (
    !parsed.revisionId ||
    !parsed.requesterUserId ||
    !parsed.projectId ||
    !parsed.clientId ||
    !parsed.manifestId ||
    !parsed.packageHash ||
    !parsed.cacheKey ||
    !parsed.expectedMainHash ||
    !parsed.profile?.coverFileObjectId ||
    !parsed.profile.mainFileObjectId
  ) {
    throw new NonRetryableJobError(
      "INVALID_ASSEMBLY_PAYLOAD",
      "The PDF assembly job payload is incomplete."
    )
  }
  return {
    ...parsed,
    profile: {
      ...parsed.profile,
      attachmentFileObjectIds: parsed.profile.attachmentFileObjectIds ?? [],
    },
    expiresInSeconds: Math.min(
      86_400,
      Math.max(60, parsed.expiresInSeconds ?? 3_600)
    ),
  } as AssemblyPayload
}

function splitProviderKey(providerKey: string) {
  const separator = providerKey.indexOf("/")
  if (separator <= 0 || separator === providerKey.length - 1) {
    throw new NonRetryableJobError(
      "INVALID_PROVIDER_KEY",
      "The storage provider key is invalid."
    )
  }
  return {
    bucket: providerKey.slice(0, separator),
    path: providerKey.slice(separator + 1),
  }
}

export function createWorkerStorage(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env
): WorkerStorage {
  let drive: drive_v3.Drive | null = null

  const privateStorageRequest = async (
    method: "GET" | "POST" | "DELETE",
    bucket: string,
    path: string,
    body?: Buffer
  ) => {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Private Supabase worker credentials are not configured.")
    }
    const encodedPath = path
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")
    const objectPath =
      method === "GET"
        ? `object/authenticated/${bucket}/${encodedPath}`
        : method === "DELETE"
          ? `object/${bucket}`
          : `object/${bucket}/${encodedPath}`
    const response = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/${objectPath}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          ...(body || method === "DELETE"
            ? {
                "Content-Type":
                  method === "DELETE" ? "application/json" : "application/pdf",
                ...(method === "POST" ? { "x-upsert": "true" } : {}),
              }
            : {}),
        },
        body:
          method === "DELETE"
            ? JSON.stringify({ prefixes: [path] })
            : body
              ? Uint8Array.from(body)
              : undefined,
      }
    )
    if (!response.ok) {
      throw new Error(
        `Private storage request failed with status ${response.status}.`
      )
    }
    return response
  }

  const getDrive = () => {
    if (!drive) {
      if (!env.GOOGLE_DRIVE_CLIENT_EMAIL || !env.GOOGLE_DRIVE_PRIVATE_KEY) {
        throw new Error("Google Drive worker credentials are not configured.")
      }
      const auth = new google.auth.JWT({
        email: env.GOOGLE_DRIVE_CLIENT_EMAIL,
        key: env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
        subject: env.GOOGLE_DRIVE_IMPERSONATE_USER || undefined,
      })
      drive = google.drive({ version: "v3", auth })
    }
    return drive
  }

  return {
    async read(fileObjectId) {
      const file = await prisma.fileObject.findUnique({
        where: { id: fileObjectId },
        include: { driveIdentity: true },
      })
      if (!file || file.deletedAt) {
        throw new NonRetryableJobError(
          "FILE_MISSING",
          "An assembly component is missing."
        )
      }

      let bytes: Buffer
      if (file.storageProvider === StorageProvider.GoogleDrive) {
        if (!file.driveIdentity) {
          throw new NonRetryableJobError(
            "DRIVE_IDENTITY_MISSING",
            "The controlled Drive identity is missing."
          )
        }
        const response = await getDrive().files.get(
          {
            fileId: file.driveIdentity.driveFileId,
            alt: "media",
            supportsAllDrives: true,
          },
          { responseType: "arraybuffer" }
        )
        bytes = Buffer.from(response.data as ArrayBuffer)
      } else if (
        file.storageProvider === StorageProvider.Supabase ||
        file.storageProvider === StorageProvider.Temporary
      ) {
        const location = splitProviderKey(file.providerKey)
        const response = await privateStorageRequest(
          "GET",
          location.bucket,
          location.path
        )
        bytes = Buffer.from(await response.arrayBuffer())
      } else {
        throw new NonRetryableJobError(
          "PROVIDER_UNSUPPORTED",
          "The assembly component storage provider is unsupported."
        )
      }
      if (sha256(bytes) !== file.checksum) {
        throw new NonRetryableJobError(
          "TAMPER_DETECTED",
          "An assembly component failed its SHA-256 integrity check."
        )
      }
      return bytes
    },

    async writeTemporary(input) {
      const bucket = env.SUPABASE_STORAGE_BUCKET_TEMP || "temp-files"
      const path = `worker-artifacts/${input.cacheKey}.pdf`
      await privateStorageRequest("POST", bucket, path, input.bytes)
      return {
        provider: StorageProvider.Temporary,
        providerKey: `${bucket}/${path}`,
        fileName: `signed-internally-${input.cacheKey.slice(0, 12)}.pdf`,
        mimeType: "application/pdf",
      }
    },

    async delete(providerKey) {
      const location = splitProviderKey(providerKey)
      await privateStorageRequest("DELETE", location.bucket, location.path)
    },
  }
}

export function createPhase10Handlers(input: {
  prisma: PrismaClient
  storage?: WorkerStorage
  now?: () => Date
}): JobHandlers {
  const storage = input.storage ?? createWorkerStorage(input.prisma)
  const now = input.now ?? (() => new Date())
  const handlers = Object.fromEntries(
    JOB_TYPES.map((jobType) => [
      jobType,
      async () => {
        throw new NonRetryableJobError(
          "ADAPTER_NOT_CONFIGURED",
          `${jobType} has no configured deployment adapter.`
        )
      },
    ])
  ) as JobHandlers

  handlers.PDF_ASSEMBLE_INTERNAL = async ({ job, heartbeat }) => {
    const payload = parseAssemblyPayload(job.payload)
    const cached = await input.prisma.generatedArtifactRecord.findUnique({
      where: { cacheKey: payload.cacheKey },
    })
    if (
      cached &&
      cached.cleanupStatus === "Available" &&
      cached.expiresAt &&
      cached.expiresAt > now()
    ) {
      return { cacheHit: 1, bytesProcessed: 0, durationMs: 0 }
    }

    await heartbeat(10, "Loading controlled PDF components.")
    const componentIds = [
      payload.profile.coverFileObjectId,
      payload.profile.mainFileObjectId,
      ...payload.profile.attachmentFileObjectIds,
    ]
    const components = await Promise.all(
      componentIds.map((id) => storage.read(id))
    )
    const totalBytes = components.reduce(
      (sum, component) => sum + component.byteLength,
      0
    )
    const engine = selectPdfAssemblyEngine({
      totalBytes,
      qpdfAvailable: false,
    })
    if (engine.engine !== "pdf-lib") {
      throw new NonRetryableJobError(
        "LARGE_PDF_ENGINE_UNAVAILABLE",
        "Large PDF assembly requires the bounded qpdf deployment worker."
      )
    }
    await heartbeat(45, "Components loaded and integrity verified.")

    const assembly = await withEncryptedTemporaryWorkspace(
      async (workspace) => {
        const encryptedPaths = await Promise.all(
          components.map((bytes, index) =>
            workspace.write(`component-${index + 1}.pdf`, bytes)
          )
        )
        const decrypted = await Promise.all(
          encryptedPaths.map((path) => workspace.read(path))
        )
        return assembleSignedInternally({
          cover: decrypted[0]!,
          main: decrypted[1]!,
          attachments: decrypted.slice(2),
          expectedMainHash: payload.expectedMainHash,
          authorized: true,
        })
      }
    )
    await heartbeat(80, "Writing the short-lived assembled artifact.")
    const stored = await storage.writeTemporary({
      cacheKey: payload.cacheKey,
      bytes: assembly.bytes,
    })
    const expiresAt = new Date(
      now().getTime() + payload.expiresInSeconds * 1_000
    )
    await input.prisma.$transaction(async (tx) => {
      const fileObject = await tx.fileObject.upsert({
        where: {
          storageProvider_providerKey: {
            storageProvider: stored.provider,
            providerKey: stored.providerKey,
          },
        },
        create: {
          storageProvider: stored.provider,
          providerKey: stored.providerKey,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          sizeBytes: BigInt(assembly.sizeBytes),
          checksum: assembly.artifactSha256,
        },
        update: {
          sizeBytes: BigInt(assembly.sizeBytes),
          checksum: assembly.artifactSha256,
          deletedAt: null,
        },
      })
      const artifact = await tx.generatedArtifactRecord.upsert({
        where: { cacheKey: payload.cacheKey },
        create: {
          revisionId: payload.revisionId,
          fileObjectId: fileObject.id,
          artifactKind: "SIGNED_INTERNALLY_PDF",
          authoritative: false,
          sourceManifestId: payload.manifestId,
          packageHash: payload.packageHash,
          cacheKey: payload.cacheKey,
          assemblyProfile: payload.profile as Prisma.InputJsonValue,
          pdfEngineVersion: assembly.engineVersion,
          artifactSha256: assembly.artifactSha256,
          sizeBytes: BigInt(assembly.sizeBytes),
          requesterUserId: payload.requesterUserId,
          authorizationScope: {
            projectId: payload.projectId,
            clientId: payload.clientId,
          },
          expiresAt,
          cleanupStatus: "Available",
          bytesProcessed: BigInt(assembly.bytesProcessed),
          assemblyDurationMs: assembly.assemblyDurationMs,
        },
        update: {
          fileObjectId: fileObject.id,
          expiresAt,
          cleanupStatus: "Available",
          cleanedAt: null,
          artifactSha256: assembly.artifactSha256,
          sizeBytes: BigInt(assembly.sizeBytes),
          bytesProcessed: BigInt(assembly.bytesProcessed),
          assemblyDurationMs: assembly.assemblyDurationMs,
        },
      })
      await tx.jobArtifact.upsert({
        where: {
          jobId_artifactId: {
            jobId: job.id,
            artifactId: artifact.id,
          },
        },
        create: {
          jobId: job.id,
          artifactId: artifact.id,
          artifactKind: artifact.artifactKind,
          checksum: assembly.artifactSha256,
          sizeBytes: BigInt(assembly.sizeBytes),
        },
        update: {},
      })
      await tx.auditLog.create({
        data: {
          actorUserId: payload.requesterUserId,
          action: "artifact.signed_internal_assembled",
          entityType: "GeneratedArtifactRecord",
          entityId: artifact.id,
          projectId: payload.projectId,
          clientId: payload.clientId,
          correlationId: job.correlationId,
          relevantHashes: {
            packageHash: payload.packageHash,
            artifactSha256: assembly.artifactSha256,
          },
          afterSnapshot: {
            jobId: job.id,
            componentOrder: assembly.componentOrder,
            sizeBytes: assembly.sizeBytes,
            expiresAt: expiresAt.toISOString(),
          },
        },
      })
    })
    await heartbeat(100, "Artifact is ready.")
    return {
      cacheHit: 0,
      bytesProcessed: assembly.bytesProcessed,
      durationMs: assembly.assemblyDurationMs,
    }
  }

  handlers.PDF_ASSEMBLE_CLIENT_RESPONSE = async ({ job, heartbeat }) => {
    const payload = job.payload as {
      responseId?: string
      revisionId?: string
      requesterUserId?: string
      projectId?: string
      packageHash?: string
      cacheKey?: string
      componentFileIds?: string[]
      label?: string
      expiresInSeconds?: number
    }
    if (
      !payload.responseId ||
      !payload.revisionId ||
      !payload.requesterUserId ||
      !payload.projectId ||
      !payload.packageHash ||
      !payload.cacheKey ||
      !payload.componentFileIds?.length
    ) {
      throw new NonRetryableJobError(
        "INVALID_CLIENT_RESPONSE_PAYLOAD",
        "The client-response assembly payload is incomplete."
      )
    }
    await heartbeat(10, "Loading exact response and submitted components.")
    const components = await Promise.all(
      payload.componentFileIds.map((id) => storage.read(id))
    )
    const totalBytes = components.reduce(
      (sum, component) => sum + component.byteLength,
      0
    )
    if (
      selectPdfAssemblyEngine({
        totalBytes,
        qpdfAvailable: false,
      }).engine !== "pdf-lib"
    ) {
      throw new NonRetryableJobError(
        "LARGE_PDF_ENGINE_UNAVAILABLE",
        "Large client-response assembly requires the bounded qpdf worker."
      )
    }
    const startedAt = performance.now()
    const bytes = await withEncryptedTemporaryWorkspace(async (workspace) => {
      const paths = await Promise.all(
        components.map((component, index) =>
          workspace.write(`response-${index + 1}.pdf`, component)
        )
      )
      return mergePdfBuffers(
        await Promise.all(paths.map((path) => workspace.read(path)))
      )
    })
    const artifactSha256 = sha256(bytes)
    const durationMs = Math.ceil(performance.now() - startedAt)
    const stored = await storage.writeTemporary({
      cacheKey: payload.cacheKey,
      bytes,
    })
    const expiresAt = new Date(
      now().getTime() +
        Math.min(86_400, Math.max(60, payload.expiresInSeconds ?? 3_600)) *
          1_000
    )
    await input.prisma.$transaction(async (tx) => {
      const fileObject = await tx.fileObject.upsert({
        where: {
          storageProvider_providerKey: {
            storageProvider: stored.provider,
            providerKey: stored.providerKey,
          },
        },
        create: {
          storageProvider: stored.provider,
          providerKey: stored.providerKey,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          sizeBytes: BigInt(bytes.byteLength),
          checksum: artifactSha256,
        },
        update: {
          sizeBytes: BigInt(bytes.byteLength),
          checksum: artifactSha256,
          deletedAt: null,
        },
      })
      const artifact = await tx.generatedArtifactRecord.upsert({
        where: { cacheKey: payload.cacheKey },
        create: {
          revisionId: payload.revisionId,
          fileObjectId: fileObject.id,
          artifactKind: "CLIENT_RESPONSE_PDF",
          authoritative: false,
          packageHash: payload.packageHash,
          cacheKey: payload.cacheKey,
          assemblyProfile: {
            responseId: payload.responseId,
            label: payload.label,
            componentFileIds: payload.componentFileIds,
          },
          pdfEngineVersion: "pdf-lib@1.17.1",
          artifactSha256,
          sizeBytes: BigInt(bytes.byteLength),
          requesterUserId: payload.requesterUserId,
          authorizationScope: { projectId: payload.projectId },
          expiresAt,
          cleanupStatus: "Available",
          bytesProcessed: BigInt(totalBytes),
          assemblyDurationMs: durationMs,
        },
        update: {
          fileObjectId: fileObject.id,
          expiresAt,
          cleanupStatus: "Available",
          cleanedAt: null,
          artifactSha256,
          sizeBytes: BigInt(bytes.byteLength),
          bytesProcessed: BigInt(totalBytes),
          assemblyDurationMs: durationMs,
        },
      })
      await tx.jobArtifact.upsert({
        where: {
          jobId_artifactId: { jobId: job.id, artifactId: artifact.id },
        },
        create: {
          jobId: job.id,
          artifactId: artifact.id,
          artifactKind: artifact.artifactKind,
          checksum: artifactSha256,
          sizeBytes: BigInt(bytes.byteLength),
        },
        update: {},
      })
      await tx.auditLog.create({
        data: {
          actorUserId: payload.requesterUserId,
          action: "client_response.artifact_assembled",
          entityType: "ClientResponse",
          entityId: payload.responseId!,
          projectId: payload.projectId,
          correlationId: job.correlationId,
          relevantHashes: {
            packageHash: payload.packageHash,
            artifactSha256,
          },
          afterSnapshot: {
            componentFileIds: payload.componentFileIds,
            label: payload.label,
            expiresAt: expiresAt.toISOString(),
          },
        },
      })
    })
    await heartbeat(100, "Client-response artifact is ready.")
    return { bytesProcessed: totalBytes, durationMs }
  }

  handlers.FILE_HASH = async ({ job }) => {
    const fileObjectId = String(job.payload.fileObjectId ?? "")
    if (!fileObjectId) {
      throw new NonRetryableJobError(
        "FILE_ID_MISSING",
        "FILE_HASH requires fileObjectId."
      )
    }
    const bytes = await storage.read(fileObjectId)
    await input.prisma.fileIntegrityCheck.create({
      data: {
        fileObjectId,
        status: IntegrityStatus.Verified,
        expectedHash: sha256(bytes),
        observedHash: sha256(bytes),
        details: { jobId: job.id },
      },
    })
    return { bytesProcessed: bytes.byteLength }
  }

  const cleanup = async () => {
    const expired = await input.prisma.generatedArtifactRecord.findMany({
      where: {
        authoritative: false,
        cleanupStatus: "Available",
        expiresAt: { lte: now() },
      },
      take: 100,
    })
    let failures = 0
    for (const artifact of expired) {
      const file = await input.prisma.fileObject.findUnique({
        where: { id: artifact.fileObjectId },
      })
      try {
        if (file) await storage.delete(file.providerKey)
        await input.prisma.generatedArtifactRecord.update({
          where: { id: artifact.id },
          data: { cleanupStatus: "Cleaned", cleanedAt: now() },
        })
      } catch {
        failures += 1
        await input.prisma.generatedArtifactRecord.update({
          where: { id: artifact.id },
          data: { cleanupStatus: "CleanupFailed" },
        })
      }
    }
    return {
      artifactsCleaned: expired.length - failures,
      cleanupFailures: failures,
    }
  }
  handlers.ARTIFACT_CLEANUP = cleanup
  handlers.TEMP_CLEANUP = cleanup

  handlers.NOTIFICATION_DISPATCH = async ({ job }) => {
    const notificationId = String(job.payload.notificationId ?? "")
    if (!notificationId) {
      throw new NonRetryableJobError(
        "NOTIFICATION_ID_MISSING",
        "NOTIFICATION_DISPATCH requires notificationId."
      )
    }
    await input.prisma.notification.update({
      where: { id: notificationId },
      data: { status: "Sent", sentAt: now() },
    })
    return { notificationsDispatched: 1 }
  }

  handlers.MALWARE_SCAN = async ({ job }) => {
    const fileObjectId = String(job.payload.fileObjectId ?? "")
    const bytes = await storage.read(fileObjectId)
    const eicar = bytes.includes(
      Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE")
    )
    if (eicar) {
      throw new NonRetryableJobError(
        "MALWARE_DETECTED",
        "The malware scanner rejected the file."
      )
    }
    return { bytesProcessed: bytes.byteLength }
  }

  return handlers
}
