import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { mergePdfBuffers } from "@dtg/pdf-engine"

export const JOB_TYPES = [
  "DRIVE_CONTROLLED_COPY",
  "FILE_HASH",
  "PDF_ASSEMBLE_INTERNAL",
  "PDF_ASSEMBLE_CLIENT_RESPONSE",
  "COVER_RENDER",
  "PLATFORM_SEAL",
  "EMAIL_SEND",
  "NOTIFICATION_DISPATCH",
  "TRANSMITTAL_DELIVER",
  "WEBHOOK_DELIVER",
  "MALWARE_SCAN",
  "TEMP_CLEANUP",
  "DRIVE_RECONCILE",
  "ARTIFACT_CLEANUP",
  "GENERAL_REQUEST_SUMMARY",
] as const

export type JobType = (typeof JOB_TYPES)[number]
export type DurableJobState =
  | "Pending"
  | "Running"
  | "Completed"
  | "Failed"
  | "DeadLetter"
  | "Canceled"

export type DurableJob = {
  id: string
  jobType: JobType
  payload: Record<string, unknown>
  state: DurableJobState
  attemptCount: number
  maxAttempts: number
  idempotencyKey: string
  correlationId?: string
  leaseOwner?: string
  leaseExpiresAt?: Date
  progress: number
}

export type QueueMetrics = {
  queueDepth: number
  running: number
  retries: number
  failed: number
  deadLetters: number
  canceled: number
}

export type JobFailure = {
  name: string
  message: string
  retryable: boolean
  code?: string
}

export type DurableJobStore = {
  enqueue(input: {
    jobType: JobType
    payload: Record<string, unknown>
    idempotencyKey: string
    correlationId?: string
    priority?: number
    maxAttempts?: number
  }): Promise<DurableJob>
  lease(input: {
    owner: string
    now: Date
    leaseMs: number
  }): Promise<DurableJob | null>
  heartbeat(input: {
    jobId: string
    owner: string
    now: Date
    leaseMs: number
    progress?: number
    message?: string
  }): Promise<boolean>
  complete(input: {
    jobId: string
    owner: string
    now: Date
    metrics?: Record<string, number>
  }): Promise<void>
  fail(input: {
    jobId: string
    owner: string
    now: Date
    error: JobFailure
    retryAt?: Date
  }): Promise<DurableJobState>
  requestCancellation(jobId: string, now: Date): Promise<boolean>
  metrics(now: Date): Promise<QueueMetrics>
}

export type JobExecutionContext = {
  job: DurableJob
  signal: AbortSignal
  heartbeat(progress: number, message?: string): Promise<void>
}

export type JobHandler = (
  context: JobExecutionContext
) => Promise<Record<string, number> | void>

export type JobHandlers = Partial<Record<JobType, JobHandler>>

export function calculateBackoffMs(
  attempt: number,
  baseMs = 1_000,
  maximumMs = 15 * 60_000
) {
  return Math.min(maximumMs, baseMs * 2 ** Math.max(0, attempt - 1))
}

export function normalizeJobFailure(error: unknown): JobFailure {
  if (error instanceof NonRetryableJobError) {
    return {
      name: error.name,
      message: error.message,
      retryable: false,
      code: error.code,
    }
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      retryable: true,
    }
  }
  return {
    name: "UnknownJobError",
    message: "Unknown worker failure.",
    retryable: true,
  }
}

export class NonRetryableJobError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "NonRetryableJobError"
    this.code = code
  }
}

export async function executeNextJob(input: {
  store: DurableJobStore
  handlers: JobHandlers
  owner: string
  leaseMs?: number
  now?: () => Date
  signal?: AbortSignal
}) {
  const now = input.now ?? (() => new Date())
  const leaseMs = input.leaseMs ?? 30_000
  const job = await input.store.lease({
    owner: input.owner,
    now: now(),
    leaseMs,
  })
  if (!job) return null

  const handler = input.handlers[job.jobType]
  if (!handler) {
    await input.store.fail({
      jobId: job.id,
      owner: input.owner,
      now: now(),
      error: {
        name: "MissingJobHandler",
        message: `No handler is registered for ${job.jobType}.`,
        retryable: false,
        code: "HANDLER_MISSING",
      },
    })
    return job
  }

  const controller = new AbortController()
  const abort = () => controller.abort(input.signal?.reason)
  input.signal?.addEventListener("abort", abort, { once: true })

  try {
    const metrics = await handler({
      job,
      signal: controller.signal,
      heartbeat: async (progress, message) => {
        const owned = await input.store.heartbeat({
          jobId: job.id,
          owner: input.owner,
          now: now(),
          leaseMs,
          progress,
          message,
        })
        if (!owned) {
          controller.abort("Job lease was lost or cancellation was requested.")
          throw new Error("Job lease was lost.")
        }
      },
    })
    await input.store.complete({
      jobId: job.id,
      owner: input.owner,
      now: now(),
      metrics: metrics ?? undefined,
    })
  } catch (error) {
    const failure = normalizeJobFailure(error)
    await input.store.fail({
      jobId: job.id,
      owner: input.owner,
      now: now(),
      error: failure,
      retryAt: failure.retryable
        ? new Date(now().getTime() + calculateBackoffMs(job.attemptCount))
        : undefined,
    })
  } finally {
    input.signal?.removeEventListener("abort", abort)
  }

  return job
}

export function createWorkerLoop(input: {
  store: DurableJobStore
  handlers: JobHandlers
  owner: string
  pollMs?: number
  leaseMs?: number
  onError?: (error: unknown) => void
}) {
  const controller = new AbortController()
  let running: Promise<void> | null = null

  const start = () => {
    if (running) return running
    running = (async () => {
      while (!controller.signal.aborted) {
        try {
          const job = await executeNextJob({
            ...input,
            signal: controller.signal,
          })
          if (!job) {
            await delay(input.pollMs ?? 1_000, controller.signal)
          }
        } catch (error) {
          if (!controller.signal.aborted) input.onError?.(error)
        }
      }
    })()
    return running
  }

  const stop = async () => {
    controller.abort("Worker shutdown requested.")
    await running
  }

  return { start, stop, signal: controller.signal }
}

function delay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve()
    const timer = setTimeout(resolve, milliseconds)
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true }
    )
  })
}

export function sha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex")
}

export function createArtifactCacheKey(
  packageHash: string,
  profile: Record<string, unknown>
) {
  return sha256(`${packageHash}:${JSON.stringify(sortJson(profile))}`)
}

export function selectPdfAssemblyEngine(input: {
  totalBytes: number
  qpdfAvailable: boolean
  moderateFileLimitBytes?: number
}) {
  const moderateFileLimitBytes =
    input.moderateFileLimitBytes ?? 32 * 1024 * 1024
  if (input.totalBytes <= moderateFileLimitBytes) {
    return {
      engine: "pdf-lib" as const,
      reason: "Moderate input stays inside the in-process benchmark envelope.",
    }
  }
  if (input.qpdfAvailable) {
    return {
      engine: "qpdf" as const,
      reason: "Large input uses bounded subprocess assembly.",
    }
  }
  return {
    engine: "unavailable" as const,
    reason:
      "Large input is rejected until the bounded qpdf worker is available.",
  }
}

export function buildQpdfAssemblyArguments(
  inputPaths: string[],
  outputPath: string
) {
  if (inputPaths.length === 0) {
    throw new NonRetryableJobError(
      "PDF_COMPONENTS_MISSING",
      "At least one PDF component is required."
    )
  }
  const safePaths = [...inputPaths, outputPath]
  if (safePaths.some((path) => path.includes("\0"))) {
    throw new NonRetryableJobError(
      "PDF_PATH_INVALID",
      "PDF assembly paths cannot contain null bytes."
    )
  }
  return ["--empty", "--pages", ...inputPaths, "--", outputPath]
}

export function signWebhookPayload(input: {
  secret: string
  timestamp: string
  body: string
  version?: number
}) {
  const version = input.version ?? 1
  const digest = createHmac("sha256", input.secret)
    .update(`${version}.${input.timestamp}.${input.body}`)
    .digest("hex")
  return `v${version}=${digest}`
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)])
    )
  }
  return value
}

export async function withEncryptedTemporaryWorkspace<T>(
  operation: (workspace: {
    directory: string
    write(name: string, bytes: Uint8Array): Promise<string>
    read(path: string): Promise<Buffer>
  }) => Promise<T>
) {
  const directory = await mkdtemp(join(tmpdir(), "dtg-worker-"))
  const key = randomBytes(32)
  const ownedPaths = new Set<string>()

  try {
    return await operation({
      directory,
      async write(name, bytes) {
        const safeName = sanitizeFilename(name)
        const path = join(directory, `${safeName}.enc`)
        const iv = randomBytes(12)
        const cipher = createCipheriv("aes-256-gcm", key, iv)
        const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()])
        const tag = cipher.getAuthTag()
        await writeFile(path, Buffer.concat([iv, tag, encrypted]), {
          mode: 0o600,
        })
        ownedPaths.add(path)
        return path
      },
      async read(path) {
        if (!ownedPaths.has(path)) {
          throw new NonRetryableJobError(
            "TEMP_PATH_DENIED",
            "Temporary path is outside the owned workspace."
          )
        }
        const encrypted = await readFile(path)
        const decipher = createDecipheriv(
          "aes-256-gcm",
          key,
          encrypted.subarray(0, 12)
        )
        decipher.setAuthTag(encrypted.subarray(12, 28))
        return Buffer.concat([
          decipher.update(encrypted.subarray(28)),
          decipher.final(),
        ])
      },
    })
  } finally {
    key.fill(0)
    await rm(directory, { recursive: true, force: true })
  }
}

export function sanitizeFilename(name: string) {
  const normalized = basename(name)
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120)
  return normalized || "artifact"
}

export async function assembleSignedInternally(input: {
  cover: Uint8Array
  main: Uint8Array
  attachments?: Uint8Array[]
  expectedMainHash: string
  authorized: boolean
}) {
  if (!input.authorized) {
    throw new NonRetryableJobError(
      "DOWNLOAD_FORBIDDEN",
      "The requester is not authorized for this controlled revision."
    )
  }
  if (sha256(input.main) !== input.expectedMainHash) {
    throw new NonRetryableJobError(
      "TAMPER_DETECTED",
      "The controlled Main PDF hash does not match the manifest."
    )
  }

  const startedAt = performance.now()
  const components = [input.cover, input.main, ...(input.attachments ?? [])]
  for (const component of components) {
    if (Buffer.from(component).subarray(0, 5).toString() !== "%PDF-") {
      throw new NonRetryableJobError(
        "CORRUPT_PDF",
        "A Signed Internally component is not a valid PDF."
      )
    }
  }

  const bytes = await mergePdfBuffers(components)
  return {
    bytes,
    artifactSha256: sha256(bytes),
    sizeBytes: bytes.byteLength,
    bytesProcessed: components.reduce(
      (total, component) => total + component.byteLength,
      0
    ),
    assemblyDurationMs: Math.ceil(performance.now() - startedAt),
    componentCount: components.length,
    componentOrder: [
      "cover",
      "main",
      ...components.slice(2).map((_, index) => `attachment-${index + 1}`),
    ],
    engineVersion: "pdf-lib@1.17.1",
  }
}

export class InMemoryDurableJobStore implements DurableJobStore {
  readonly jobs = new Map<
    string,
    DurableJob & {
      nextAttemptAt: Date
      cancelRequestedAt?: Date
      lastError?: JobFailure
    }
  >()
  private sequence = 0

  async enqueue(input: {
    jobType: JobType
    payload: Record<string, unknown>
    idempotencyKey: string
    correlationId?: string
    priority?: number
    maxAttempts?: number
  }) {
    const existing = [...this.jobs.values()].find(
      (job) => job.idempotencyKey === input.idempotencyKey
    )
    if (existing) return structuredClone(existing)

    const job: DurableJob & { nextAttemptAt: Date } = {
      id: `job-${++this.sequence}`,
      jobType: input.jobType,
      payload: structuredClone(input.payload),
      state: "Pending",
      attemptCount: 0,
      maxAttempts: input.maxAttempts ?? 5,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      progress: 0,
      nextAttemptAt: new Date(0),
    }
    this.jobs.set(job.id, job)
    return structuredClone(job)
  }

  async lease(input: { owner: string; now: Date; leaseMs: number }) {
    const candidate = [...this.jobs.values()]
      .filter(
        (job) =>
          !job.cancelRequestedAt &&
          (((["Pending", "Failed"] as DurableJobState[]).includes(job.state) &&
            job.nextAttemptAt <= input.now) ||
            (job.state === "Running" &&
              Boolean(job.leaseExpiresAt && job.leaseExpiresAt <= input.now)))
      )
      .sort((left, right) => left.id.localeCompare(right.id))[0]
    if (!candidate) return null

    candidate.state = "Running"
    candidate.attemptCount += 1
    candidate.leaseOwner = input.owner
    candidate.leaseExpiresAt = new Date(input.now.getTime() + input.leaseMs)
    return structuredClone(candidate)
  }

  async heartbeat(input: {
    jobId: string
    owner: string
    now: Date
    leaseMs: number
    progress?: number
    message?: string
  }) {
    const job = this.jobs.get(input.jobId)
    if (
      !job ||
      job.state !== "Running" ||
      job.leaseOwner !== input.owner ||
      job.cancelRequestedAt
    ) {
      return false
    }
    job.leaseExpiresAt = new Date(input.now.getTime() + input.leaseMs)
    job.progress = Math.max(0, Math.min(100, input.progress ?? job.progress))
    return true
  }

  async complete(input: {
    jobId: string
    owner: string
    now: Date
    metrics?: Record<string, number>
  }) {
    const job = this.requireOwned(input.jobId, input.owner)
    job.state = "Completed"
    job.progress = 100
    job.leaseOwner = undefined
    job.leaseExpiresAt = undefined
  }

  async fail(input: {
    jobId: string
    owner: string
    now: Date
    error: JobFailure
    retryAt?: Date
  }) {
    const job = this.requireOwned(input.jobId, input.owner)
    job.lastError = input.error
    job.leaseOwner = undefined
    job.leaseExpiresAt = undefined
    if (job.cancelRequestedAt) {
      job.state = "Canceled"
    } else if (!input.error.retryable || job.attemptCount >= job.maxAttempts) {
      job.state = "DeadLetter"
    } else {
      job.state = "Failed"
      job.nextAttemptAt =
        input.retryAt ??
        new Date(input.now.getTime() + calculateBackoffMs(job.attemptCount))
    }
    return job.state
  }

  async requestCancellation(jobId: string, now: Date) {
    const job = this.jobs.get(jobId)
    if (!job || ["Completed", "DeadLetter", "Canceled"].includes(job.state)) {
      return false
    }
    job.cancelRequestedAt = now
    if (job.state !== "Running") job.state = "Canceled"
    return true
  }

  async metrics(now: Date) {
    const jobs = [...this.jobs.values()]
    return {
      queueDepth: jobs.filter(
        (job) =>
          ["Pending", "Failed"].includes(job.state) && job.nextAttemptAt <= now
      ).length,
      running: jobs.filter((job) => job.state === "Running").length,
      retries: jobs.reduce(
        (total, job) => total + Math.max(0, job.attemptCount - 1),
        0
      ),
      failed: jobs.filter((job) => job.state === "Failed").length,
      deadLetters: jobs.filter((job) => job.state === "DeadLetter").length,
      canceled: jobs.filter((job) => job.state === "Canceled").length,
    }
  }

  private requireOwned(jobId: string, owner: string) {
    const job = this.jobs.get(jobId)
    if (!job || job.state !== "Running" || job.leaseOwner !== owner) {
      throw new Error("Job lease is not owned by this worker.")
    }
    return job
  }
}
