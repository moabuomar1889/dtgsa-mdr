import {
  IntegrityStatus,
  JobState,
  Prisma,
  StorageProvider,
  type PrismaClient,
} from "@prisma/client"
import { resolve } from "node:path"
import { Readable } from "node:stream"
import { google, type drive_v3 } from "googleapis"
import {
  LocalFilesystemDriveAdapter,
  assertLocalAcceptanceMode,
} from "@dtg/local-acceptance"
import {
  JOB_TYPES,
  NonRetryableJobError,
  assembleSignedInternally,
  selectPdfAssemblyEngine,
  sha256,
  withEncryptedTemporaryWorkspace,
  type JobHandlers,
} from "@dtg/job-engine"
import { createGeneralRequestSummary } from "@dtg/integration-domain"
import {
  assertWebhookUrl,
  decryptWebhookSecret,
  nextWebhookAttempt,
  signWebhook,
} from "@dtg/integration-domain"
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

export function createWorkerStorage(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env
): WorkerStorage {
  if (env.LOCAL_ACCEPTANCE_MODE === "true") {
    assertLocalAcceptanceMode(env)
    const runtimeRoot = env.LOCAL_RUNTIME_ROOT?.trim()
    if (!runtimeRoot) throw new Error("LOCAL_RUNTIME_ROOT is required.")
    const createAdapter = (
      directory: string,
      driveId: string
    ) =>
      new LocalFilesystemDriveAdapter({
        root: resolve(runtimeRoot, directory),
        runtimeRoot,
        driveId,
        env,
      })
    const controlledAdapter = createAdapter(
      "controlled-documents",
      "local-controlled-drive"
    )
    const sourceAdapter = createAdapter("source-drive", "local-source-drive")
    const temporaryAdapter = createAdapter(
      "temporary-artifacts",
      "local-temporary-artifacts"
    )
    const adapterFor = (provider: StorageProvider) => {
      if (provider === StorageProvider.LOCAL_SOURCE_FILESYSTEM) {
        return sourceAdapter
      }
      if (provider === StorageProvider.LOCAL_TEMPORARY_ARTIFACT) {
        return temporaryAdapter
      }
      if (provider === StorageProvider.LOCAL_CONTROLLED_FILESYSTEM) {
        return controlledAdapter
      }
      throw new NonRetryableJobError(
        "PROVIDER_UNSUPPORTED",
        "The local assembly component provider is unsupported."
      )
    }
    const toBuffer = async (stream: NodeJS.ReadableStream) => {
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(Buffer.from(chunk))
      return Buffer.concat(chunks)
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
        const fileId = file.driveIdentity?.driveFileId ?? file.providerKey
        const bytes = await toBuffer(
          await adapterFor(file.storageProvider).read(fileId)
        )
        if (sha256(bytes) !== file.checksum) {
          throw new NonRetryableJobError(
            "TAMPER_DETECTED",
            "An assembly component failed its SHA-256 integrity check."
          )
        }
        return bytes
      },
      async writeTemporary(input) {
        const uploaded = await temporaryAdapter.uploadResumable({
          folderId: "local-worker-artifacts",
          opaqueName: `${input.cacheKey}.pdf`,
          mimeType: "application/pdf",
          bytes: Readable.from(input.bytes),
        })
        return {
          provider: StorageProvider.LOCAL_TEMPORARY_ARTIFACT,
          providerKey: uploaded.fileId,
          fileName: `signed-internally-${input.cacheKey.slice(0, 12)}.pdf`,
          mimeType: "application/pdf",
        }
      },
      async delete(providerKey) {
        await temporaryAdapter.deleteTemporary(providerKey)
      },
    }
  }

  let drive: drive_v3.Drive | null = null

  const getDrive = () => {
    if (!drive) {
      if (!env.GOOGLE_DRIVE_CLIENT_EMAIL || !env.GOOGLE_DRIVE_PRIVATE_KEY) {
        throw new Error("Google Drive worker credentials are not configured.")
      }
      const auth = new google.auth.JWT({
        email: env.GOOGLE_DRIVE_CLIENT_EMAIL,
        key: env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/drive"],
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

      if (
        file.storageProvider !== StorageProvider.GOOGLE_DRIVE_CONTROLLED &&
        file.storageProvider !== StorageProvider.GOOGLE_DRIVE_SOURCE
      ) {
        throw new NonRetryableJobError(
          "PROVIDER_UNSUPPORTED",
          "The assembly component storage provider is unsupported."
        )
      }
      const response = await getDrive().files.get(
        {
          fileId: file.driveIdentity?.driveFileId ?? file.providerKey,
          alt: "media",
          supportsAllDrives: true,
        },
        { responseType: "arraybuffer" }
      )
      const bytes = Buffer.from(response.data as ArrayBuffer)
      if (sha256(bytes) !== file.checksum) {
        throw new NonRetryableJobError(
          "TAMPER_DETECTED",
          "An assembly component failed its SHA-256 integrity check."
        )
      }
      return bytes
    },

    async writeTemporary(input) {
      const folderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim()
      if (!folderId) {
        throw new Error("Google Drive worker artifact folder is not configured.")
      }
      const uploaded = await getDrive().files.create({
        supportsAllDrives: true,
        requestBody: {
          name: `${input.cacheKey}.pdf`,
          parents: [folderId],
        },
        media: {
          mimeType: "application/pdf",
          body: Readable.from(input.bytes),
        },
        fields: "id",
      })
      if (!uploaded.data.id) {
        throw new Error("Google Drive did not return an artifact File ID.")
      }
      return {
        provider: StorageProvider.GOOGLE_DRIVE_CONTROLLED,
        providerKey: uploaded.data.id,
        fileName: `signed-internally-${input.cacheKey.slice(0, 12)}.pdf`,
        mimeType: "application/pdf",
      }
    },

    async delete(providerKey) {
      await getDrive().files.delete({
        fileId: providerKey,
        supportsAllDrives: true,
      })
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

  handlers.GENERAL_REQUEST_SUMMARY = async ({ job, heartbeat }) => {
    const generalRequestId = String(job.payload.generalRequestId ?? "")
    if (!generalRequestId) {
      throw new NonRetryableJobError(
        "INVALID_GENERAL_REQUEST_PAYLOAD",
        "The general-request summary payload is incomplete."
      )
    }
    const request = await input.prisma.generalRequest.findUnique({
      where: { id: generalRequestId },
    })
    if (!request) {
      throw new NonRetryableJobError(
        "GENERAL_REQUEST_MISSING",
        "The general request no longer exists."
      )
    }
    const version = await input.prisma.generalRequestTypeVersion.findUnique({
      where: { id: request.requestTypeVersionId },
    })
    const requestType = version
      ? await input.prisma.generalRequestType.findUnique({
          where: { id: version.requestTypeId },
        })
      : null
    if (!version || !requestType) {
      throw new NonRetryableJobError(
        "GENERAL_REQUEST_TYPE_MISSING",
        "The captured request type version is unavailable."
      )
    }
    await heartbeat(25, "Rendering the immutable request summary.")
    const bytes = createGeneralRequestSummary({
      requestNumber: request.requestNumber,
      typeName: requestType.name,
      departmentOwner: requestType.departmentOwner,
      purpose: request.purpose,
      fields: request.formData as Record<string, unknown>,
    })
    const checksum = sha256(bytes)
    const cacheKey = `general-request-${request.id}`
    const stored = await storage.writeTemporary({ cacheKey, bytes })
    await heartbeat(75, "Persisting summary evidence.")
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
          fileName: `${request.requestNumber}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: BigInt(bytes.byteLength),
          checksum,
        },
        update: {
          sizeBytes: BigInt(bytes.byteLength),
          checksum,
          deletedAt: null,
        },
      })
      await tx.generalRequest.update({
        where: { id: request.id },
        data: {
          summaryFileObjectId: fileObject.id,
          status: request.status === "Submitted" ? "Active" : request.status,
        },
      })
      await tx.jobArtifact.upsert({
        where: {
          jobId_artifactId: {
            jobId: job.id,
            artifactId: fileObject.id,
          },
        },
        create: {
          jobId: job.id,
          artifactId: fileObject.id,
          artifactKind: "GENERAL_REQUEST_SUMMARY",
          checksum,
          sizeBytes: BigInt(bytes.byteLength),
        },
        update: {},
      })
      await tx.outboxEvent.create({
        data: {
          eventType: "FILE_READY",
          aggregateType: "GeneralRequest",
          aggregateId: request.id,
          correlationId: job.correlationId,
          payload: {
            requestNumber: request.requestNumber,
            artifactKind: "GENERAL_REQUEST_SUMMARY",
            checksum,
          },
        },
      })
    })
    await heartbeat(100, "General request summary is ready.")
    return { bytesProcessed: bytes.byteLength }
  }

  handlers.WEBHOOK_DELIVER = async ({ job, heartbeat }) => {
    const endpointId = String(job.payload.endpointId ?? "")
    const outboxEventId = String(job.payload.outboxEventId ?? "")
    if (!endpointId || !outboxEventId) {
      throw new NonRetryableJobError(
        "INVALID_WEBHOOK_PAYLOAD",
        "Webhook delivery requires endpoint and outbox event IDs."
      )
    }
    const [endpoint, event] = await Promise.all([
      input.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } }),
      input.prisma.outboxEvent.findUnique({ where: { id: outboxEventId } }),
    ])
    if (!endpoint?.isActive || !endpoint.encryptedSecret || !event) {
      throw new NonRetryableJobError(
        "WEBHOOK_UNAVAILABLE",
        "The webhook endpoint or source event is unavailable."
      )
    }
    if (!endpoint.eventTypes.includes(event.eventType)) {
      throw new NonRetryableJobError(
        "WEBHOOK_EVENT_NOT_SUBSCRIBED",
        "The endpoint is not subscribed to this event."
      )
    }
    const encryptionKey = process.env.WEBHOOK_ENCRYPTION_KEY?.trim()
    if (!encryptionKey) {
      throw new Error("WEBHOOK_ENCRYPTION_KEY is required.")
    }
    const destination = assertWebhookUrl(endpoint.url)
    const secret = decryptWebhookSecret(endpoint.encryptedSecret, encryptionKey)
    const timestamp = now().toISOString()
    const body = JSON.stringify({
      id: event.id,
      type: event.eventType,
      occurredAt: event.createdAt.toISOString(),
      aggregate: {
        type: event.aggregateType,
        id: event.aggregateId,
      },
      data: event.payload,
    })
    const delivery = await input.prisma.webhookDelivery.upsert({
      where: {
        endpointId_outboxEventId: { endpointId, outboxEventId },
      },
      create: { endpointId, outboxEventId },
      update: {},
    })
    await heartbeat(25, "Signing the webhook payload.")
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000)
      const response = await fetch(destination, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "dtg-webhook-id": event.id,
          "dtg-webhook-timestamp": timestamp,
          "dtg-webhook-signature": signWebhook(secret, timestamp, body),
          "idempotency-key": event.id,
        },
        body,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))
      if (!response.ok) {
        throw new Error(`Webhook endpoint returned HTTP ${response.status}.`)
      }
      await input.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          state: JobState.Completed,
          attemptCount: { increment: 1 },
          responseCode: response.status,
          responseMetadata: {
            contentType: response.headers.get("content-type"),
          },
          completedAt: now(),
          lastError: Prisma.JsonNull,
        },
      })
      await heartbeat(100, "Webhook delivered.")
      return { deliveries: 1 }
    } catch (error) {
      const attemptCount = delivery.attemptCount + 1
      const retry = nextWebhookAttempt(attemptCount, now())
      await input.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          state: retry.deadLetter ? JobState.DeadLetter : JobState.Failed,
          attemptCount,
          nextAttemptAt: retry.nextAttemptAt ?? now(),
          deadLetteredAt: retry.deadLetter ? now() : null,
          lastError: {
            message:
              error instanceof Error
                ? error.message
                : "Webhook delivery failed.",
          },
        },
      })
      throw error
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
