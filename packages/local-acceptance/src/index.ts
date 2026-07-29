import {
  createHash,
  createHmac,
  generateKeyPairSync,
  randomUUID,
  sign,
  timingSafeEqual,
  verify,
} from "node:crypto"
import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
} from "node:fs"
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises"
import { isIP } from "node:net"
import { basename, dirname, join, relative, resolve, sep } from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type {
  DriveFileMetadata,
  DrivePermission,
  DriveStorageAdapter,
} from "@dtg/controlled-storage-domain"
import type {
  DirectoryUser,
  WorkspaceDirectoryAdapter,
} from "@dtg/identity-domain"

export const LOCAL_ACCEPTANCE_FLAG = "LOCAL_ACCEPTANCE_MODE"
export const LOCAL_ACCEPTANCE_SEAL = "LOCAL DEVELOPMENT APPLICATION SEAL"

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"])
const PRODUCTION_MARKERS = [
  "dtgapps.cc",
  "googleapis.com",
  "accounts.google.com",
  "supabase.co",
  "cloudflare.com",
  "coolify",
]

export type LocalAcceptanceClassification =
  | "VERIFIED_LOCAL"
  | "VERIFIED_LOCAL_E2E"
  | "SIMULATED_PROVIDER"
  | "CODE_COMPLETE_UNVERIFIED_EXTERNAL"
  | "BLOCKED_LOCAL_TOOLING"
  | "DEFERRED"
  | "FAILED"
  | "NOT_APPLICABLE"

export function isLocalAcceptanceMode(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env[LOCAL_ACCEPTANCE_FLAG] === "true"
}

export function assertLocalAcceptanceMode(
  env: NodeJS.ProcessEnv = process.env
) {
  if (!isLocalAcceptanceMode(env)) {
    throw new Error("Local acceptance provider is disabled.")
  }
  if (env.NODE_ENV === "production") {
    throw new Error("Local acceptance mode is forbidden in production.")
  }
}

function normalizeHost(hostname: string) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "")
}

export function assertLoopbackUrl(value: string, label = "Local service URL") {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${label} must be an absolute URL.`)
  }
  const host = normalizeHost(parsed.hostname)
  const forbidden = PRODUCTION_MARKERS.find((marker) =>
    parsed.href.toLowerCase().includes(marker)
  )
  if (forbidden || (!LOOPBACK_HOSTS.has(host) && isIP(host) !== 0)) {
    throw new Error(`${label} must target a loopback address.`)
  }
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error(`${label} must target a loopback address.`)
  }
  return parsed
}

export function assertLocalDatabaseUrl(value: string) {
  const parsed = assertLoopbackUrl(value, "Local database URL")
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Local database must use PostgreSQL.")
  }
  const databaseName = parsed.pathname.replace(/^\//, "").toLowerCase()
  if (
    !databaseName ||
    !/(local|test|demo)/.test(databaseName) ||
    /(prod|production|staging|live)/.test(databaseName)
  ) {
    throw new Error(
      "Local database name must contain local, test, or demo and must not look production-like."
    )
  }
  return {
    host: normalizeHost(parsed.hostname),
    port: parsed.port || "5432",
    databaseName,
  }
}

export function assertLocalRuntimePath(
  targetPath: string,
  runtimeRoot: string
) {
  const root = resolve(runtimeRoot)
  const target = resolve(targetPath)
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error("Local runtime path escapes the approved runtime root.")
  }
  return target
}

export function assertLocalProviderConfiguration(
  env: NodeJS.ProcessEnv = process.env
) {
  assertLocalAcceptanceMode(env)
  if (env.DATABASE_URL) assertLocalDatabaseUrl(env.DATABASE_URL)
  for (const [name, value] of Object.entries(env)) {
    if (!value) continue
    if (
      /(_URL|_ENDPOINT|SMTP_HOST)$/i.test(name) &&
      /^(https?|postgres(?:ql)?):\/\//i.test(value)
    ) {
      assertLoopbackUrl(value, name)
    }
  }
  const providerValues = [
    env.EMAIL_PROVIDER,
    env.STORAGE_PROVIDER,
    env.SIGNING_PROVIDER,
  ].filter(Boolean)
  if (providerValues.some((value) => value !== "local")) {
    throw new Error("Local acceptance mode requires local provider selection.")
  }
}

type PersistedDriveFile = {
  metadata: Omit<DriveFileMetadata, "modifiedTime"> & {
    modifiedTime?: string
  }
  permissions: DrivePermission[]
}

type PersistedDriveIndex = {
  version: 1
  files: Record<string, PersistedDriveFile>
}

export class LocalFilesystemDriveAdapter implements DriveStorageAdapter {
  private readonly root: string
  private readonly driveId: string
  private readonly indexPath: string

  constructor(input: {
    root: string
    runtimeRoot: string
    driveId: string
    env?: NodeJS.ProcessEnv
  }) {
    assertLocalAcceptanceMode(input.env)
    this.root = assertLocalRuntimePath(input.root, input.runtimeRoot)
    this.driveId = input.driveId
    this.indexPath = join(this.root, "index.json")
  }

  private async loadIndex(): Promise<PersistedDriveIndex> {
    await mkdir(join(this.root, "objects"), { recursive: true })
    if (!existsSync(this.indexPath)) return { version: 1, files: {} }
    return JSON.parse(
      await readFile(this.indexPath, "utf8")
    ) as PersistedDriveIndex
  }

  private async saveIndex(index: PersistedDriveIndex) {
    const temporary = `${this.indexPath}.${process.pid}.tmp`
    await writeFile(temporary, JSON.stringify(index, null, 2))
    await rename(temporary, this.indexPath)
  }

  private objectPath(fileId: string) {
    if (!/^[a-f0-9-]{36}$/.test(fileId)) {
      throw new Error("Local Drive File ID is invalid.")
    }
    return join(this.root, "objects", `${fileId}.bin`)
  }

  private toMetadata(file: PersistedDriveFile): DriveFileMetadata {
    return {
      ...file.metadata,
      modifiedTime: file.metadata.modifiedTime
        ? new Date(file.metadata.modifiedTime)
        : undefined,
    }
  }

  async getMetadata(fileId: string) {
    const file = (await this.loadIndex()).files[fileId]
    return file ? this.toMetadata(file) : null
  }

  async read(fileId: string, range?: { start: number; end: number }) {
    const file = (await this.loadIndex()).files[fileId]
    if (!file || file.metadata.trashed) throw new Error("Drive file not found.")
    const path = this.objectPath(fileId)
    return createReadStream(
      path,
      range ? { start: range.start, end: range.end } : undefined
    )
  }

  async importFile(input: {
    sourcePath: string
    name?: string
    mimeType: string
    parentId: string
    permissions?: DrivePermission[]
  }) {
    const source = assertLocalRuntimePath(input.sourcePath, dirname(this.root))
    const sourceStat = await stat(source)
    const fileId = randomUUID()
    const destination = this.objectPath(fileId)
    await mkdir(dirname(destination), { recursive: true })
    await pipeline(createReadStream(source), createWriteStream(destination))
    const index = await this.loadIndex()
    const metadata: DriveFileMetadata = {
      fileId,
      driveId: this.driveId,
      name: input.name ?? basename(source),
      mimeType: input.mimeType,
      sizeBytes: sourceStat.size,
      parents: [input.parentId],
      owners: ["local-provider@local.test"],
      trashed: false,
      modifiedTime: new Date(),
    }
    index.files[fileId] = {
      metadata: {
        ...metadata,
        modifiedTime: metadata.modifiedTime?.toISOString(),
      },
      permissions: input.permissions ?? [],
    }
    await this.saveIndex(index)
    return metadata
  }

  async copy(input: {
    sourceFileId: string
    destinationFolderId: string
    opaqueName: string
  }) {
    const source = await this.getMetadata(input.sourceFileId)
    if (!source) throw new Error("Drive source file not found.")
    const sourcePath = this.objectPath(source.fileId)
    return this.importFile({
      sourcePath,
      name: input.opaqueName,
      mimeType: source.mimeType,
      parentId: input.destinationFolderId,
    })
  }

  async createFolder(input: {
    name: string
    parentId: string
    driveId?: string
  }) {
    const id = randomUUID()
    const index = await this.loadIndex()
    index.files[id] = {
      metadata: {
        fileId: id,
        driveId: input.driveId ?? this.driveId,
        name: input.name,
        mimeType: "application/vnd.google-apps.folder",
        sizeBytes: 0,
        parents: [input.parentId],
        owners: ["local-provider@local.test"],
        trashed: false,
        modifiedTime: new Date().toISOString(),
      },
      permissions: [],
    }
    await this.saveIndex(index)
    return { id, driveId: input.driveId ?? this.driveId }
  }

  async listPermissions(fileId: string) {
    return [...((await this.loadIndex()).files[fileId]?.permissions ?? [])]
  }

  async removePermission(fileId: string, permissionId: string) {
    const index = await this.loadIndex()
    const file = index.files[fileId]
    if (!file) throw new Error("Drive file not found.")
    file.permissions = file.permissions.filter(({ id }) => id !== permissionId)
    await this.saveIndex(index)
  }

  async applyRestrictedPermissions(
    fileId: string,
    allowedPrincipals: readonly string[]
  ) {
    const index = await this.loadIndex()
    const file = index.files[fileId]
    if (!file) throw new Error("Drive file not found.")
    file.permissions = allowedPrincipals.map((emailAddress, indexValue) => ({
      id: `local-${indexValue + 1}`,
      type: "user",
      role: "reader",
      emailAddress: emailAddress.toLowerCase(),
    }))
    await this.saveIndex(index)
  }

  async move(fileId: string, destinationFolderId: string) {
    const index = await this.loadIndex()
    const file = index.files[fileId]
    if (!file) throw new Error("Drive file not found.")
    file.metadata.parents = [destinationFolderId]
    file.metadata.modifiedTime = new Date().toISOString()
    await this.saveIndex(index)
  }

  async rename(fileId: string, name: string) {
    const index = await this.loadIndex()
    const file = index.files[fileId]
    if (!file) throw new Error("Drive file not found.")
    file.metadata.name = name
    file.metadata.modifiedTime = new Date().toISOString()
    await this.saveIndex(index)
  }

  async setTrashed(fileId: string, trashed: boolean) {
    const index = await this.loadIndex()
    const file = index.files[fileId]
    if (!file) throw new Error("Drive file not found.")
    file.metadata.trashed = trashed
    await this.saveIndex(index)
  }

  async tamper(fileId: string, bytes: Buffer) {
    await writeFile(this.objectPath(fileId), bytes)
  }

  async uploadResumable(input: {
    folderId: string
    opaqueName: string
    mimeType: string
    bytes: Readable
  }) {
    const fileId = randomUUID()
    const path = this.objectPath(fileId)
    await mkdir(dirname(path), { recursive: true })
    await pipeline(input.bytes, createWriteStream(path))
    const fileStat = await stat(path)
    const index = await this.loadIndex()
    const metadata: DriveFileMetadata = {
      fileId,
      driveId: this.driveId,
      name: input.opaqueName,
      mimeType: input.mimeType,
      sizeBytes: fileStat.size,
      parents: [input.folderId],
      owners: ["local-provider@local.test"],
      trashed: false,
      modifiedTime: new Date(),
    }
    index.files[fileId] = {
      metadata: {
        ...metadata,
        modifiedTime: metadata.modifiedTime?.toISOString(),
      },
      permissions: [],
    }
    await this.saveIndex(index)
    return metadata
  }

  async deleteTemporary(fileId: string) {
    const index = await this.loadIndex()
    delete index.files[fileId]
    await rm(this.objectPath(fileId), { force: true })
    await this.saveIndex(index)
  }
}

export const LOCAL_SYNTHETIC_USERS: readonly DirectoryUser[] = [
  [
    "local-dc-admin",
    "dc.admin@local.test",
    "Amina Rahman",
    "Document Control",
    "DC Administrator",
    ["local-dc-admins"],
  ],
  [
    "local-dc-operator",
    "dc.operator@local.test",
    "Omar Haddad",
    "Document Control",
    "DC Operator",
    ["local-dc-users"],
  ],
  [
    "local-prepared-manager",
    "prepared.manager@local.test",
    "Layla Nasser",
    "Engineering",
    "Prepared By Manager",
    ["local-discipline-managers"],
  ],
  [
    "local-reviewer",
    "reviewer@local.test",
    "Yousef Karim",
    "Engineering",
    "Independent Reviewer",
    ["local-reviewers"],
  ],
  [
    "local-approver",
    "approver@local.test",
    "Sara Mansour",
    "Management",
    "Approver",
    ["local-approvers"],
  ],
  [
    "local-additional-manager",
    "additional.manager@local.test",
    "Tariq Saleh",
    "Management",
    "Additional Manager",
    ["local-approvers"],
  ],
  [
    "local-validator",
    "dc.validator@local.test",
    "Noor Ibrahim",
    "Document Control",
    "DC Validator",
    ["local-dc-users"],
  ],
  [
    "local-auditor",
    "auditor@local.test",
    "Maya Faris",
    "Compliance",
    "Auditor",
    ["local-auditors"],
  ],
  [
    "local-project-viewer",
    "project.viewer@local.test",
    "Adam Saeed",
    "Projects",
    "Project Viewer",
    ["local-project-viewers"],
  ],
  [
    "local-client-user",
    "client.user@local.test",
    "Hana Aziz",
    "Synthetic Client",
    "Client User",
    ["local-client-users"],
  ],
].map(([subject, primaryEmail, fullName, department, jobTitle, groups]) => ({
  subject: subject as string,
  primaryEmail: primaryEmail as string,
  fullName: fullName as string,
  employeeId: `SYN-${String(subject).toUpperCase()}`,
  department: department as string,
  jobTitle: jobTitle as string,
  suspended: false,
  groups: groups as string[],
}))

export class LocalWorkspaceDirectoryAdapter implements WorkspaceDirectoryAdapter {
  constructor(
    private readonly users: readonly DirectoryUser[] = LOCAL_SYNTHETIC_USERS,
    env: NodeJS.ProcessEnv = process.env
  ) {
    assertLocalAcceptanceMode(env)
  }

  async listUsers(input: { cursor?: string; dryRun: boolean }) {
    const offset = input.cursor ? Number(input.cursor) : 0
    const users = this.users.slice(offset, offset + 5)
    const next = offset + users.length
    return {
      users: users.map((user) => ({ ...user, groups: [...user.groups] })),
      nextCursor: next < this.users.length ? String(next) : undefined,
    }
  }
}

export type MalwareOutcome =
  | "CLEAN"
  | "INFECTED"
  | "ERROR"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "UNKNOWN"

export class LocalMalwareScanner {
  constructor(env: NodeJS.ProcessEnv = process.env) {
    assertLocalAcceptanceMode(env)
  }

  scan(bytes: Buffer, requested?: MalwareOutcome) {
    const outcome =
      requested ??
      (bytes.includes(Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"))
        ? "INFECTED"
        : "CLEAN")
    return {
      outcome,
      safe: outcome === "CLEAN",
      provider: "SIMULATED_PROVIDER",
    } as const
  }
}

export type LocalEmailMessage = {
  id: string
  to: string
  subject: string
  text: string
  correlationId: string
  createdAt: string
  status: "delivered" | "failed" | "dead-letter"
}

export class LocalEmailSink {
  private readonly messagesPath: string

  constructor(input: {
    root: string
    runtimeRoot: string
    env?: NodeJS.ProcessEnv
  }) {
    assertLocalAcceptanceMode(input.env)
    const root = assertLocalRuntimePath(input.root, input.runtimeRoot)
    this.messagesPath = join(root, "messages.json")
  }

  async list() {
    if (!existsSync(this.messagesPath)) return [] as LocalEmailMessage[]
    return JSON.parse(
      await readFile(this.messagesPath, "utf8")
    ) as LocalEmailMessage[]
  }

  async deliver(
    input: Omit<LocalEmailMessage, "id" | "createdAt" | "status"> & {
      simulate?: "failure" | "dead-letter"
    }
  ) {
    if (!input.to.toLowerCase().endsWith("@local.test")) {
      throw new Error("Local email sink refuses non-local recipients.")
    }
    const messages = await this.list()
    const message: LocalEmailMessage = {
      id: randomUUID(),
      to: input.to.toLowerCase(),
      subject: input.subject,
      text: input.text,
      correlationId: input.correlationId,
      createdAt: new Date().toISOString(),
      status:
        input.simulate === "failure"
          ? "failed"
          : input.simulate === "dead-letter"
            ? "dead-letter"
            : "delivered",
    }
    await mkdir(dirname(this.messagesPath), { recursive: true })
    await writeFile(
      this.messagesPath,
      JSON.stringify([...messages, message], null, 2)
    )
    return message
  }
}

export function signLocalWebhook(
  secret: string,
  timestamp: string,
  body: string
) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex")
}

export class LocalWebhookVerifier {
  private readonly seen = new Set<string>()

  constructor(
    private readonly secrets: readonly string[],
    env: NodeJS.ProcessEnv = process.env
  ) {
    assertLocalAcceptanceMode(env)
  }

  verify(input: {
    eventId: string
    timestamp: string
    body: string
    signature: string
    now?: Date
  }) {
    if (this.seen.has(input.eventId))
      throw new Error("Webhook replay rejected.")
    const age = Math.abs(
      (input.now ?? new Date()).getTime() - new Date(input.timestamp).getTime()
    )
    if (!Number.isFinite(age) || age > 5 * 60_000) {
      throw new Error("Webhook timestamp is outside the allowed window.")
    }
    const provided = Buffer.from(input.signature, "hex")
    const valid = this.secrets.some((secret) => {
      const expected = Buffer.from(
        signLocalWebhook(secret, input.timestamp, input.body),
        "hex"
      )
      return (
        expected.length === provided.length &&
        timingSafeEqual(expected, provided)
      )
    })
    if (!valid) throw new Error("Webhook signature is invalid.")
    this.seen.add(input.eventId)
    return { accepted: true, idempotent: false }
  }
}

type LocalSigningRegistry = {
  activeKeyId: string
  keys: Record<
    string,
    {
      publicKeyPem: string
      state: "active" | "retired" | "revoked"
      createdAt: string
    }
  >
}

export class LocalEd25519SigningProvider {
  private readonly root: string
  private readonly registryPath: string

  constructor(input: {
    root: string
    runtimeRoot: string
    env?: NodeJS.ProcessEnv
  }) {
    assertLocalAcceptanceMode(input.env)
    this.root = assertLocalRuntimePath(input.root, input.runtimeRoot)
    this.registryPath = join(this.root, "registry.json")
  }

  async initialise() {
    if (!existsSync(this.registryPath)) await this.rotate()
    return this.publicRegistry()
  }

  private async registry(): Promise<LocalSigningRegistry> {
    return JSON.parse(
      await readFile(this.registryPath, "utf8")
    ) as LocalSigningRegistry
  }

  async rotate() {
    await mkdir(this.root, { recursive: true })
    const keyId = `local-ed25519-${randomUUID()}`
    const pair = generateKeyPairSync("ed25519")
    const publicKeyPem = pair.publicKey
      .export({ type: "spki", format: "pem" })
      .toString()
    const privateKeyPem = pair.privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString()
    let registry: LocalSigningRegistry = {
      activeKeyId: keyId,
      keys: {},
    }
    if (existsSync(this.registryPath)) {
      registry = await this.registry()
      const previous = registry.keys[registry.activeKeyId]
      if (previous) previous.state = "retired"
      registry.activeKeyId = keyId
    }
    registry.keys[keyId] = {
      publicKeyPem,
      state: "active",
      createdAt: new Date().toISOString(),
    }
    await writeFile(join(this.root, `${keyId}.private.pem`), privateKeyPem, {
      mode: 0o600,
    })
    await writeFile(this.registryPath, JSON.stringify(registry, null, 2))
    return keyId
  }

  async sign(payload: Buffer) {
    const registry = await this.registry()
    const keyId = registry.activeKeyId
    const privateKey = readFileSync(join(this.root, `${keyId}.private.pem`))
    return {
      keyId,
      algorithm: "Ed25519",
      seal: LOCAL_ACCEPTANCE_SEAL,
      payloadHash: createHash("sha256").update(payload).digest("hex"),
      signature: sign(null, payload, privateKey).toString("base64url"),
    }
  }

  async verify(payload: Buffer, input: { keyId: string; signature: string }) {
    const registry = await this.registry()
    const key = registry.keys[input.keyId]
    if (!key || key.state === "revoked") return false
    return verify(
      null,
      payload,
      key.publicKeyPem,
      Buffer.from(input.signature, "base64url")
    )
  }

  async revoke(keyId: string) {
    const registry = await this.registry()
    const key = registry.keys[keyId]
    if (!key) throw new Error("Unknown local signing key.")
    key.state = "revoked"
    await writeFile(this.registryPath, JSON.stringify(registry, null, 2))
  }

  async publicRegistry() {
    const registry = await this.registry()
    return {
      activeKeyId: registry.activeKeyId,
      keys: registry.keys,
      seal: LOCAL_ACCEPTANCE_SEAL,
    }
  }
}

export function localRuntimeRelativePath(path: string, runtimeRoot: string) {
  return relative(
    resolve(runtimeRoot),
    assertLocalRuntimePath(path, runtimeRoot)
  )
}
