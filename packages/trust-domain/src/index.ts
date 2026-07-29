import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto"

export const MANIFEST_SCHEMA_VERSION = "1"
export const CANONICALIZATION_VERSION = "RFC8785-DTG-1"
export const HASH_ALGORITHM = "SHA-256"

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

function canonicalValue(value: JsonValue): string {
  if (value === null || typeof value === "boolean") return JSON.stringify(value)
  if (typeof value === "string") return JSON.stringify(value)
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("Non-finite numbers are unsupported.")
    return JSON.stringify(Object.is(value, -0) ? 0 : value)
  }
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(",")}]`
  const keys = Object.keys(value).sort()
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalValue(value[key]!)}`)
    .join(",")}}`
}

export function canonicalize(value: JsonValue): Buffer {
  return Buffer.from(canonicalValue(value), "utf8")
}

export function digest(bytes: Buffer | string) {
  return createHash("sha256").update(bytes).digest("hex")
}

export type ManifestFile = {
  internalFileId: string
  driveIdentitySnapshot: string
  sha256: string
  mimeType: string
  sizeBytes: number
  pageCount: number
}

export type PackageManifestV1 = {
  schemaVersion: "1"
  canonicalizationVersion: "RFC8785-DTG-1"
  hashAlgorithm: "SHA-256"
  organization: { id: string; name: string }
  client: { id: string; name: string }
  project: { id: string; code: string; name: string }
  document: {
    id: string
    baseNumber: string
    externalRevision: string
    metadataSnapshot: JsonValue
    classificationSnapshot: JsonValue
  }
  mainFile: ManifestFile
  attachments: Array<ManifestFile & { kind: string }>
  coverTemplate: { versionId: string; snapshotHash: string }
  workflow: { snapshotId: string; digest: string }
  createdAt: string
  creatingSystem: { name: string; version: string }
}

const SHA256 = /^[a-f0-9]{64}$/

export function normalizeManifest(input: PackageManifestV1): PackageManifestV1 {
  if (
    input.schemaVersion !== MANIFEST_SCHEMA_VERSION ||
    input.canonicalizationVersion !== CANONICALIZATION_VERSION
  ) {
    throw new Error("Unsupported manifest version.")
  }
  const hashes = [
    input.mainFile.sha256,
    input.coverTemplate.snapshotHash,
    input.workflow.digest,
    ...input.attachments.map((item) => item.sha256),
  ]
  if (hashes.some((hash) => !SHA256.test(hash))) {
    throw new Error("Manifest contains a missing or invalid SHA-256 hash.")
  }
  const attachments = [...input.attachments].sort((a, b) =>
    `${a.kind}:${a.internalFileId}`.localeCompare(
      `${b.kind}:${b.internalFileId}`
    )
  )
  const duplicate = attachments.find(
    (item, index) =>
      index > 0 &&
      item.kind === attachments[index - 1]!.kind &&
      item.internalFileId === attachments[index - 1]!.internalFileId
  )
  if (duplicate) throw new Error("Manifest contains duplicate attachment keys.")
  return { ...input, attachments }
}

export function createPackageHash(input: PackageManifestV1) {
  const manifest = normalizeManifest(input)
  const canonicalBytes = canonicalize(manifest as unknown as JsonValue)
  return { manifest, canonicalBytes, packageHash: digest(canonicalBytes) }
}

export type ApprovalEvidencePayload = {
  googleSubjectId: string
  employee: { id: string; name: string }
  roleSnapshot: JsonValue
  departmentOrProjectRole: string
  documentNumber: string
  revision: string
  mainFileSha256: string
  packageHash: string
  workflowSnapshot: { id: string; digest: string }
  approvalCycleId: string
  stepInstanceId: string
  reviewSessionId: string
  decision: string
  declaration: { version: string; textHash: string }
  commentReferences: string[]
  recentAuthEvidenceId: string
  decidedAt: string
  request: { sessionHash: string; ipHash: string; userAgentHash: string }
  signatureAppearanceVersionId: string
}

export function createApprovalEvidence(payload: ApprovalEvidencePayload) {
  if (
    !SHA256.test(payload.mainFileSha256) ||
    !SHA256.test(payload.packageHash)
  ) {
    throw new Error("Approval evidence requires file and package hashes.")
  }
  const normalized = {
    ...payload,
    commentReferences: [...new Set(payload.commentReferences)].sort(),
  }
  const canonicalBytes = canonicalize(normalized as unknown as JsonValue)
  return {
    payload: normalized,
    canonicalBytes,
    contentHash: digest(canonicalBytes),
  }
}

export interface SigningProvider {
  readonly provider: string
  readonly keyId: string
  readonly algorithm: string
  sign(payload: Buffer): Promise<Buffer>
}

export interface PlatformSealProvider extends SigningProvider {
  publicKeyReference(): string
}

export interface PdfSealProvider {
  sealPdf(input: NodeJS.ReadableStream): Promise<NodeJS.ReadableStream>
}

export interface TimestampProvider {
  readonly provider: string
  readonly type: "PLATFORM_UTC" | "RFC3161"
  timestamp(payloadHash: string): Promise<{
    timestamp: Date
    token?: Buffer
    status: "RECORDED" | "TRUSTED"
  }>
}

export interface KeyRegistryProvider {
  resolve(keyId: string): Promise<{
    publicKeyPem: string
    status: "ACTIVE" | "REVOKED" | "UNKNOWN"
  }>
}

const TEST_PRIVATE_KEY_DER =
  "MC4CAQAwBQYDK2VwBCIEIIJ6WKZvhABiXwJIAd+PCmqT7GadlYf/ab8zwA3az/Tf"
export const TEST_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAEC/eNqaiWGmHqdA73rmnCG7hEW/YNJ7XdEnSYasfkw0=
-----END PUBLIC KEY-----`

export class TestPlatformSealProvider implements PlatformSealProvider {
  readonly provider = "DETERMINISTIC_TEST"
  readonly keyId = "dtg-test-ed25519-v1"
  readonly algorithm = "Ed25519"
  constructor(environment = process.env.NODE_ENV) {
    if (environment === "production") {
      throw new Error("Test signing provider is forbidden in production.")
    }
  }
  async sign(payload: Buffer) {
    return sign(
      null,
      payload,
      createPrivateKey({
        key: Buffer.from(TEST_PRIVATE_KEY_DER, "base64"),
        format: "der",
        type: "pkcs8",
      })
    )
  }
  publicKeyReference() {
    return this.keyId
  }
}

export class DevelopmentPlatformSealProvider implements PlatformSealProvider {
  readonly provider = "DEVELOPMENT_ENVIRONMENT"
  readonly algorithm = "Ed25519"
  constructor(
    readonly keyId: string,
    private readonly privateKeyPem: string,
    private readonly publicKeyRef: string,
    environment = process.env.NODE_ENV
  ) {
    if (environment === "production") {
      throw new Error(
        "Development signing provider is forbidden in production."
      )
    }
  }
  async sign(payload: Buffer) {
    return sign(null, payload, createPrivateKey(this.privateKeyPem))
  }
  publicKeyReference() {
    return this.publicKeyRef
  }
}

export class PlatformUtcTimestampProvider implements TimestampProvider {
  readonly provider = "PLATFORM_DATABASE_UTC"
  readonly type = "PLATFORM_UTC" as const
  async timestamp() {
    return { timestamp: new Date(), status: "RECORDED" as const }
  }
}

export type VerificationStatus =
  | "VALID"
  | "INVALID_HASH"
  | "INVALID_MANIFEST"
  | "INVALID_SEAL"
  | "UNKNOWN_KEY"
  | "REVOKED_KEY"
  | "MISSING_FILE"
  | "TAMPER_DETECTED"
  | "UNSUPPORTED_VERSION"
  | "LEGACY_UNVERIFIABLE"

export async function verifySeal(input: {
  payload: Buffer
  signature: Buffer
  keyId: string
  registry: KeyRegistryProvider
}): Promise<{ status: VerificationStatus; reasons: string[] }> {
  const key = await input.registry.resolve(input.keyId)
  if (key.status === "UNKNOWN")
    return { status: "UNKNOWN_KEY", reasons: ["KEY_UNKNOWN"] }
  if (key.status === "REVOKED")
    return { status: "REVOKED_KEY", reasons: ["KEY_REVOKED"] }
  const valid = verify(
    null,
    input.payload,
    createPublicKey(key.publicKeyPem),
    input.signature
  )
  return valid
    ? { status: "VALID", reasons: [] }
    : { status: "INVALID_SEAL", reasons: ["SIGNATURE_MISMATCH"] }
}

export function classifyLegacySignatureEvent() {
  return {
    classification: "LEGACY_VISIBLE_SIGNATURE_EVENT",
    fileBound: false,
    platformSealed: false,
    verificationStatus: "LEGACY_UNVERIFIABLE" as const,
  }
}

export type AuditChainEntry = {
  id: string
  stream: string
  sequence: number
  payload: JsonValue
  previousHash: string | null
  currentHash: string
}

export function appendAuditHash(
  previous: AuditChainEntry | null,
  input: Omit<AuditChainEntry, "previousHash" | "currentHash">
): AuditChainEntry {
  if (
    previous &&
    (previous.stream !== input.stream ||
      previous.sequence + 1 !== input.sequence)
  ) {
    throw new Error("Audit append sequence is not contiguous.")
  }
  const previousHash = previous?.currentHash ?? null
  const currentHash = digest(
    canonicalize({ ...input, previousHash } as unknown as JsonValue)
  )
  return { ...input, previousHash, currentHash }
}

export function verifyAuditChain(entries: AuditChainEntry[]) {
  let previous: AuditChainEntry | null = null
  for (const entry of entries) {
    const expected = appendAuditHash(previous, {
      id: entry.id,
      stream: entry.stream,
      sequence: entry.sequence,
      payload: entry.payload,
    })
    if (
      expected.previousHash !== entry.previousHash ||
      expected.currentHash !== entry.currentHash
    ) {
      return { valid: false, failedEntryId: entry.id }
    }
    previous = entry
  }
  return { valid: true, failedEntryId: null }
}
