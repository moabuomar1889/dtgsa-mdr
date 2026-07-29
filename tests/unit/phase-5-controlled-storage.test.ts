import assert from "node:assert/strict"
import { test } from "node:test"
import {
  FakeDriveStorageAdapter,
  computeFolderRoute,
  opaqueControlledFileName,
  parseByteRange,
  permissionFingerprint,
  secureFileHeaders,
  sha256,
  unauthorizedPermissions,
  validatePickerMetadata,
  type DriveFileMetadata,
} from "../../packages/controlled-storage-domain/src/index"
import { createWorkerRuntime } from "../../apps/worker/src/runtime"

const metadata: DriveFileMetadata = {
  fileId: "source-1",
  driveId: "drive-1",
  name: "Working Drawing.pdf",
  mimeType: "application/pdf",
  sizeBytes: 4,
  parents: ["working-folder"],
  owners: ["dc@dtg.example"],
  trashed: false,
}

test("Picker metadata validation uses server metadata and Drive identity", () => {
  assert.equal(
    validatePickerMetadata(metadata, {
      allowedDriveIds: ["drive-1"],
      maxSizeBytes: 10,
    }).fileId,
    "source-1"
  )
})

test("Picker metadata rejects wrong MIME, location, size, missing, and trashed files", () => {
  assert.throws(
    () =>
      validatePickerMetadata(
        { ...metadata, mimeType: "text/plain" },
        { allowedDriveIds: ["drive-1"], maxSizeBytes: 10 }
      ),
    /must be a PDF/
  )
  assert.throws(
    () =>
      validatePickerMetadata(metadata, {
        allowedDriveIds: ["other-drive"],
        maxSizeBytes: 10,
      }),
    /outside an authorized location/
  )
  assert.throws(
    () =>
      validatePickerMetadata(metadata, {
        allowedDriveIds: [],
        maxSizeBytes: 3,
      }),
    /size is not allowed/
  )
  assert.throws(
    () =>
      validatePickerMetadata(null, {
        allowedDriveIds: [],
        maxSizeBytes: 10,
      }),
    /missing or trashed/
  )
  assert.throws(
    () =>
      validatePickerMetadata(
        { ...metadata, trashed: true },
        { allowedDriveIds: [], maxSizeBytes: 10 }
      ),
    /missing or trashed/
  )
})

test("controlled names are opaque and collision-resistant", () => {
  const first = opaqueControlledFileName("pdf")
  const second = opaqueControlledFileName("pdf")
  assert.match(first, /^[a-f0-9]{48}\.pdf$/)
  assert.notEqual(first, second)
  assert.equal(first.includes(metadata.name), false)
})

test("folder routing uses stable tokens and sanitizes display values", () => {
  assert.deepEqual(
    computeFolderRoute(["year", "client", "project"], {
      year: 2026,
      client: "ACME / Main",
      project: "P-100",
    }),
    ["2026", "ACME - Main", "P-100"]
  )
  assert.throws(
    () => computeFolderRoute(["year", "project"], { year: 2026 }),
    /project is missing/
  )
})

test("permission policy detects public, domain, and unknown principals", () => {
  const permissions = [
    { id: "1", type: "anyone" as const, role: "reader" },
    { id: "2", type: "domain" as const, role: "reader" },
    {
      id: "3",
      type: "user" as const,
      role: "reader",
      emailAddress: "allowed@dtg.example",
    },
    {
      id: "4",
      type: "user" as const,
      role: "writer",
      emailAddress: "unknown@example.com",
    },
  ]
  assert.deepEqual(
    unauthorizedPermissions(permissions, ["allowed@dtg.example"]).map(
      ({ id }) => id
    ),
    ["1", "2", "4"]
  )
  assert.equal(permissionFingerprint(permissions).length, 64)
})

test("byte range parser supports full and partial delivery safely", () => {
  assert.equal(parseByteRange(null, 100), null)
  assert.deepEqual(parseByteRange("bytes=10-19", 100), {
    start: 10,
    end: 19,
  })
  assert.deepEqual(parseByteRange("bytes=90-", 100), {
    start: 90,
    end: 99,
  })
  assert.throws(() => parseByteRange("bytes=100-101", 100), /outside/)
  assert.throws(() => parseByteRange("items=1-2", 100), /invalid/)
})

test("file delivery headers prevent shared caching and MIME sniffing", () => {
  const headers = secureFileHeaders({
    fileName: 'drawing"final.pdf',
    mimeType: "application/pdf",
    sizeBytes: 100,
    range: { start: 10, end: 19 },
  })
  assert.equal(headers["Cache-Control"], "private, no-store, max-age=0")
  assert.equal(headers["X-Content-Type-Options"], "nosniff")
  assert.equal(headers["Content-Range"], "bytes 10-19/100")
  assert.equal(headers["Content-Length"], "10")
  assert.equal(headers["Content-Disposition"]?.includes('"final'), false)
})

test("fake Drive copy remains addressable after rename and move", async () => {
  const adapter = new FakeDriveStorageAdapter()
  adapter.seed(metadata, Buffer.from("PDF!"))
  const copied = await adapter.copy({
    sourceFileId: metadata.fileId,
    destinationFolderId: "controlled-root",
    opaqueName: opaqueControlledFileName(),
  })
  const originalId = copied.fileId
  await adapter.move(originalId, "archive-folder")
  const stored = adapter.files.get(originalId)!
  stored.metadata.name = "renamed.pdf"
  assert.equal((await adapter.getMetadata(originalId))?.fileId, originalId)
  assert.deepEqual((await adapter.getMetadata(originalId))?.parents, [
    "archive-folder",
  ])
})

test("fake Drive supports server-side range reads", async () => {
  const adapter = new FakeDriveStorageAdapter()
  adapter.seed(metadata, Buffer.from("0123456789"))
  const chunks: Buffer[] = []
  for await (const chunk of await adapter.read("source-1", {
    start: 2,
    end: 5,
  })) {
    chunks.push(Buffer.from(chunk))
  }
  assert.equal(Buffer.concat(chunks).toString(), "2345")
})

test("fake Drive restricted permissions never create a public link", async () => {
  const adapter = new FakeDriveStorageAdapter()
  adapter.seed(metadata, Buffer.from("PDF!"), [
    { id: "public", type: "anyone", role: "reader" },
  ])
  await adapter.applyRestrictedPermissions("source-1", ["service@dtg.example"])
  assert.deepEqual(await adapter.listPermissions("source-1"), [
    {
      id: "allowed-0",
      type: "user",
      role: "reader",
      emailAddress: "service@dtg.example",
    },
  ])
  assert.equal(
    adapter.calls.some((call) => call.includes("public")),
    false
  )
})

test("resumable fake upload is deterministic and hashes complete bytes", async () => {
  const adapter = new FakeDriveStorageAdapter()
  const { Readable } = await import("node:stream")
  const uploaded = await adapter.uploadResumable({
    folderId: "controlled-root",
    opaqueName: "opaque.bin",
    mimeType: "application/octet-stream",
    bytes: Readable.from([Buffer.from("part-1"), Buffer.from("part-2")]),
  })
  const bytes = adapter.files.get(uploaded.fileId)!.bytes
  assert.equal(bytes.toString(), "part-1part-2")
  assert.equal(sha256(bytes), sha256("part-1part-2"))
})

test("worker dispatches only the registered controlled-copy job", async () => {
  const calls: string[] = []
  const runtime = createWorkerRuntime({ NODE_ENV: "test" }, () => undefined, {
    DRIVE_CONTROLLED_COPY: async (jobId) => {
      calls.push(jobId)
      return "completed"
    },
  })
  runtime.start()
  assert.equal(
    await runtime.executeJob("DRIVE_CONTROLLED_COPY", "job-1"),
    "completed"
  )
  assert.deepEqual(calls, ["job-1"])
  await runtime.stop()
})
