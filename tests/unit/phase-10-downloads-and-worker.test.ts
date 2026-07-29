import assert from "node:assert/strict"
import { access } from "node:fs/promises"
import test from "node:test"
import { PDFDocument } from "pdf-lib"
import {
  JOB_TYPES,
  InMemoryDurableJobStore,
  NonRetryableJobError,
  assembleSignedInternally,
  buildQpdfAssemblyArguments,
  calculateBackoffMs,
  createArtifactCacheKey,
  executeNextJob,
  selectPdfAssemblyEngine,
  sha256,
  signWebhookPayload,
  withEncryptedTemporaryWorkspace,
} from "@dtg/job-engine"

async function onePage(label: string) {
  const document = await PDFDocument.create()
  const page = document.addPage([200, 200])
  page.drawText(label, { x: 20, y: 100 })
  return Buffer.from(await document.save())
}

test("Phase 10 registers the complete durable job catalog", () => {
  assert.deepEqual(JOB_TYPES, [
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
  ])
})

test("enqueue is idempotent and leases are exclusive", async () => {
  const store = new InMemoryDurableJobStore()
  const first = await store.enqueue({
    jobType: "FILE_HASH",
    payload: { fileObjectId: "file-1" },
    idempotencyKey: "hash:file-1",
  })
  const duplicate = await store.enqueue({
    jobType: "FILE_HASH",
    payload: { fileObjectId: "different" },
    idempotencyKey: "hash:file-1",
  })
  assert.equal(duplicate.id, first.id)
  const now = new Date("2026-07-30T00:00:00Z")
  const lease = await store.lease({ owner: "worker-a", now, leaseMs: 1_000 })
  assert.equal(lease?.id, first.id)
  assert.equal(
    await store.lease({ owner: "worker-b", now, leaseMs: 1_000 }),
    null
  )
})

test("stale leases recover after a worker crash", async () => {
  const store = new InMemoryDurableJobStore()
  await store.enqueue({
    jobType: "FILE_HASH",
    payload: {},
    idempotencyKey: "crash-recovery",
  })
  const now = new Date("2026-07-30T00:00:00Z")
  await store.lease({ owner: "crashed-worker", now, leaseMs: 1_000 })
  const recovered = await store.lease({
    owner: "recovery-worker",
    now: new Date(now.getTime() + 1_001),
    leaseMs: 1_000,
  })
  assert.equal(recovered?.leaseOwner, "recovery-worker")
  assert.equal(recovered?.attemptCount, 2)
})

test("retry uses exponential backoff and reaches dead letter", async () => {
  const store = new InMemoryDurableJobStore()
  await store.enqueue({
    jobType: "EMAIL_SEND",
    payload: {},
    idempotencyKey: "email:one",
    maxAttempts: 2,
  })
  let clock = new Date("2026-07-30T00:00:00Z")
  const run = () =>
    executeNextJob({
      store,
      owner: "worker-a",
      now: () => clock,
      handlers: {
        EMAIL_SEND: async () => {
          throw new Error("provider unavailable")
        },
      },
    })
  await run()
  assert.equal([...store.jobs.values()][0]?.state, "Failed")
  assert.equal(calculateBackoffMs(1), 1_000)
  assert.equal(calculateBackoffMs(4), 8_000)
  clock = new Date(clock.getTime() + 1_000)
  await run()
  assert.equal([...store.jobs.values()][0]?.state, "DeadLetter")
})

test("non-retryable errors dead-letter immediately and cancellation is final", async () => {
  const store = new InMemoryDurableJobStore()
  const invalid = await store.enqueue({
    jobType: "PDF_ASSEMBLE_INTERNAL",
    payload: {},
    idempotencyKey: "invalid-pdf",
  })
  await executeNextJob({
    store,
    owner: "worker-a",
    now: () => new Date("2026-07-30T00:00:00Z"),
    handlers: {
      PDF_ASSEMBLE_INTERNAL: async () => {
        throw new NonRetryableJobError("CORRUPT_PDF", "Corrupt PDF.")
      },
    },
  })
  assert.equal(store.jobs.get(invalid.id)?.state, "DeadLetter")

  const canceled = await store.enqueue({
    jobType: "EMAIL_SEND",
    payload: {},
    idempotencyKey: "cancel-me",
  })
  assert.equal(
    await store.requestCancellation(
      canceled.id,
      new Date("2026-07-30T00:00:00Z")
    ),
    true
  )
  assert.equal(store.jobs.get(canceled.id)?.state, "Canceled")
})

test("Signed Internally composition preserves exact order and hashes output", async () => {
  const cover = await onePage("cover")
  const main = await onePage("main")
  const attachment = await onePage("attachment")
  const result = await assembleSignedInternally({
    cover,
    main,
    attachments: [attachment],
    expectedMainHash: sha256(main),
    authorized: true,
  })
  const assembled = await PDFDocument.load(result.bytes)
  assert.equal(assembled.getPageCount(), 3)
  assert.deepEqual(result.componentOrder, ["cover", "main", "attachment-1"])
  assert.equal(result.artifactSha256, sha256(result.bytes))
  assert.equal(result.componentCount, 3)
})

test("assembly blocks unauthorized, missing-integrity, and corrupt PDF inputs", async () => {
  const valid = await onePage("valid")
  await assert.rejects(
    assembleSignedInternally({
      cover: valid,
      main: valid,
      expectedMainHash: sha256(valid),
      authorized: false,
    }),
    /not authorized/
  )
  await assert.rejects(
    assembleSignedInternally({
      cover: valid,
      main: valid,
      expectedMainHash: "0".repeat(64),
      authorized: true,
    }),
    /does not match/
  )
  await assert.rejects(
    assembleSignedInternally({
      cover: Buffer.from("not a PDF"),
      main: valid,
      expectedMainHash: sha256(valid),
      authorized: true,
    }),
    /not a valid PDF/
  )
})

test("cache keys are canonical and webhook signatures are versioned", () => {
  const left = createArtifactCacheKey("a".repeat(64), { b: 2, a: 1 })
  const right = createArtifactCacheKey("a".repeat(64), { a: 1, b: 2 })
  assert.equal(left, right)
  assert.match(
    signWebhookPayload({
      secret: "rotation-secret",
      timestamp: "2026-07-30T00:00:00Z",
      body: '{"event":"approved"}',
      version: 2,
    }),
    /^v2=[a-f0-9]{64}$/
  )
})

test("encrypted temporary workspaces clean up even after failure", async () => {
  let directory = ""
  await assert.rejects(
    withEncryptedTemporaryWorkspace(async (workspace) => {
      directory = workspace.directory
      const path = await workspace.write(
        "unsafe/../main.pdf",
        Buffer.from("secret")
      )
      assert.equal((await workspace.read(path)).toString(), "secret")
      throw new Error("synthetic crash")
    }),
    /synthetic crash/
  )
  await assert.rejects(access(directory))
})

test("100 MB profile selects bounded qpdf and never shell-concatenates paths", () => {
  assert.deepEqual(
    selectPdfAssemblyEngine({
      totalBytes: 100 * 1024 * 1024,
      qpdfAvailable: true,
    }).engine,
    "qpdf"
  )
  assert.equal(
    selectPdfAssemblyEngine({
      totalBytes: 100 * 1024 * 1024,
      qpdfAvailable: false,
    }).engine,
    "unavailable"
  )
  assert.deepEqual(
    buildQpdfAssemblyArguments(
      ["C:\\temp\\cover.pdf", "C:\\temp\\main.pdf"],
      "C:\\temp\\output.pdf"
    ),
    [
      "--empty",
      "--pages",
      "C:\\temp\\cover.pdf",
      "C:\\temp\\main.pdf",
      "--",
      "C:\\temp\\output.pdf",
    ]
  )
})
