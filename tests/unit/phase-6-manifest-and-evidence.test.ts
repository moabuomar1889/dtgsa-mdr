import assert from "node:assert/strict"
import { test } from "node:test"
import {
  TEST_PUBLIC_KEY,
  TestPlatformSealProvider,
  appendAuditHash,
  canonicalize,
  classifyLegacySignatureEvent,
  createApprovalEvidence,
  createPackageHash,
  digest,
  verifyAuditChain,
  verifySeal,
  type KeyRegistryProvider,
  type PackageManifestV1,
} from "../../packages/trust-domain/src/index"

const hash = (value: string) => digest(value)
const manifest: PackageManifestV1 = {
  schemaVersion: "1",
  canonicalizationVersion: "RFC8785-DTG-1",
  hashAlgorithm: "SHA-256",
  organization: { id: "dtg", name: "DTG" },
  client: { id: "client-1", name: "Client" },
  project: { id: "project-1", code: "P1", name: "Project" },
  document: {
    id: "doc-1",
    baseNumber: "DTG-P1-001",
    externalRevision: "A",
    metadataSnapshot: { title: "Drawing", scale: 100 },
    classificationSnapshot: { discipline: "ARC" },
  },
  mainFile: {
    internalFileId: "file-1",
    driveIdentitySnapshot: hash("drive-1"),
    sha256: hash("pdf"),
    mimeType: "application/pdf",
    sizeBytes: 3,
    pageCount: 1,
  },
  attachments: [],
  coverTemplate: { versionId: "cover-1", snapshotHash: hash("cover") },
  workflow: { snapshotId: "workflow-1", digest: hash("workflow") },
  createdAt: "2026-07-29T00:00:00.000Z",
  creatingSystem: { name: "DTG Signature Platform", version: "0.1.0" },
}

test("canonicalization is deterministic and rejects non-finite numbers", () => {
  assert.equal(
    canonicalize({ z: 1, a: { y: 2, x: 3 } }).toString(),
    '{"a":{"x":3,"y":2},"z":1}'
  )
  assert.throws(() => canonicalize({ value: Number.NaN }))
})

test("manifest golden vector is stable and representation order independent", () => {
  const first = createPackageHash(manifest)
  const reordered = createPackageHash({
    ...manifest,
    organization: { name: "DTG", id: "dtg" },
  })
  assert.equal(first.packageHash, reordered.packageHash)
  assert.equal(
    first.packageHash,
    "ada17cc71e22e7025049b2bf5306251b9bf5d402a9eabcc5cfe38389388266e0"
  )
})

test("every protected manifest change changes the package hash", () => {
  const original = createPackageHash(manifest).packageHash
  const changed = [
    {
      ...manifest,
      mainFile: { ...manifest.mainFile, sha256: hash("changed") },
    },
    { ...manifest, document: { ...manifest.document, externalRevision: "B" } },
    {
      ...manifest,
      workflow: { ...manifest.workflow, digest: hash("changed") },
    },
  ]
  for (const item of changed) {
    assert.notEqual(createPackageHash(item).packageHash, original)
  }
  assert.throws(() =>
    createPackageHash({ ...manifest, schemaVersion: "2" } as PackageManifestV1)
  )
})

test("approval evidence is canonical, immutable input, and hash bound", () => {
  const evidence = createApprovalEvidence({
    googleSubjectId: "google-subject",
    employee: { id: "employee-1", name: "Approver" },
    roleSnapshot: { role: "approver" },
    departmentOrProjectRole: "Lead",
    documentNumber: "DTG-P1-001",
    revision: "A",
    mainFileSha256: manifest.mainFile.sha256,
    packageHash: createPackageHash(manifest).packageHash,
    workflowSnapshot: manifest.workflow,
    approvalCycleId: "cycle-1",
    stepInstanceId: "step-1",
    reviewSessionId: "review-1",
    decision: "APPROVE",
    declaration: { version: "1", textHash: hash("I approve") },
    commentReferences: ["comment-2", "comment-1"],
    recentAuthEvidenceId: "auth-1",
    decidedAt: "2026-07-29T00:01:00.000Z",
    request: {
      sessionHash: hash("session"),
      ipHash: hash("ip"),
      userAgentHash: hash("agent"),
    },
    signatureAppearanceVersionId: "appearance-1",
  })
  assert.equal(evidence.contentHash, digest(evidence.canonicalBytes))
  assert.deepEqual(evidence.payload.commentReferences, [
    "comment-1",
    "comment-2",
  ])
})

test("test seal verifies, modified payload fails, and production fails closed", async () => {
  const provider = new TestPlatformSealProvider("test")
  const payload = Buffer.from("package-envelope")
  const signature = await provider.sign(payload)
  const registry: KeyRegistryProvider = {
    async resolve() {
      return { publicKeyPem: TEST_PUBLIC_KEY, status: "ACTIVE" }
    },
  }
  assert.equal(
    (await verifySeal({ payload, signature, keyId: provider.keyId, registry }))
      .status,
    "VALID"
  )
  assert.equal(
    (
      await verifySeal({
        payload: Buffer.from("modified"),
        signature,
        keyId: provider.keyId,
        registry,
      })
    ).status,
    "INVALID_SEAL"
  )
  assert.throws(() => new TestPlatformSealProvider("production"))
})

test("unknown and revoked keys return exact verification reasons", async () => {
  const payload = Buffer.from("payload")
  const signature = Buffer.alloc(64)
  for (const [keyStatus, expected] of [
    ["UNKNOWN", "UNKNOWN_KEY"],
    ["REVOKED", "REVOKED_KEY"],
  ] as const) {
    const registry: KeyRegistryProvider = {
      async resolve() {
        return { publicKeyPem: TEST_PUBLIC_KEY, status: keyStatus }
      },
    }
    assert.equal(
      (await verifySeal({ payload, signature, keyId: "key", registry })).status,
      expected
    )
  }
})

test("legacy visible signatures remain untrusted", () => {
  assert.deepEqual(classifyLegacySignatureEvent(), {
    classification: "LEGACY_VISIBLE_SIGNATURE_EVENT",
    fileBound: false,
    platformSealed: false,
    verificationStatus: "LEGACY_UNVERIFIABLE",
  })
})

test("audit chain validates and detects payload tampering", () => {
  const first = appendAuditHash(null, {
    id: "audit-1",
    stream: "project-1",
    sequence: 1,
    payload: { action: "created" },
  })
  const second = appendAuditHash(first, {
    id: "audit-2",
    stream: "project-1",
    sequence: 2,
    payload: { action: "approved" },
  })
  assert.deepEqual(verifyAuditChain([first, second]), {
    valid: true,
    failedEntryId: null,
  })
  assert.deepEqual(
    verifyAuditChain([first, { ...second, payload: { action: "tampered" } }]),
    { valid: false, failedEntryId: "audit-2" }
  )
})
