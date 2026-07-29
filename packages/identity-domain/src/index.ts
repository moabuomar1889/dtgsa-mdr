import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"

export const AUTH_MODES = {
  googleWorkspace: "GOOGLE_WORKSPACE",
  localAcceptanceIdentity: "LOCAL_ACCEPTANCE_IDENTITY",
} as const

export type AuthMode = (typeof AUTH_MODES)[keyof typeof AUTH_MODES]

export type GoogleOidcClaims = {
  iss?: unknown
  aud?: unknown
  sub?: unknown
  email?: unknown
  email_verified?: unknown
  hd?: unknown
  nonce?: unknown
  exp?: unknown
  iat?: unknown
  name?: unknown
}

export type ValidatedGoogleIdentity = {
  subject: string
  email: string
  hostedDomain: string
  fullName: string | null
}

export type DirectoryUser = {
  subject: string
  primaryEmail: string
  fullName: string
  employeeId?: string
  department?: string
  jobTitle?: string
  suspended: boolean
  groups: string[]
}

export type DirectorySyncPage = {
  users: DirectoryUser[]
  nextCursor?: string
}

export interface WorkspaceDirectoryAdapter {
  listUsers(input: {
    cursor?: string
    dryRun: boolean
  }): Promise<DirectorySyncPage>
}

export type MagicLinkState = {
  tokenHash: string
  expiresAt: Date
  revokedAt?: Date | null
  usePolicy: "OneTime" | "Reusable"
  useCount: number
  maxAttempts: number
  failedAttempts: number
}

export type SessionState = {
  expiresAt: Date
  revokedAt?: Date | null
}

export type RecentAuthenticationState = {
  authenticatedAt: Date
  expiresAt: Date
  consumedAt?: Date | null
  revokedAt?: Date | null
  sessionHash?: string | null
}

export type RouteAudience = "internal" | "external" | "public" | "auth"

function asNonEmptyString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Google identity claim ${field} is required.`)
  }
  return value.trim()
}

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  )
}

export function hashOpaqueToken(value: string) {
  return createHash("sha256").update(value, "utf8").digest("base64url")
}

export function issueOpaqueToken(size = 32) {
  if (size < 24) {
    throw new Error("Opaque security tokens must contain at least 24 bytes.")
  }
  return randomBytes(size).toString("base64url")
}

export function createPkcePair() {
  const verifier = issueOpaqueToken(48)
  const challenge = hashOpaqueToken(verifier)
  return { verifier, challenge }
}

export function assertAuthModeAllowed(
  mode: AuthMode,
  nodeEnvironment: string | undefined
) {
  if (nodeEnvironment === "production" && mode !== AUTH_MODES.googleWorkspace) {
    throw new Error(
      "Production requires GOOGLE_WORKSPACE authentication."
    )
  }
  if (
    mode !== AUTH_MODES.googleWorkspace &&
    mode !== AUTH_MODES.localAcceptanceIdentity
  ) {
    throw new Error("The internal identity provider is not supported.")
  }
  return mode
}

export function validateGoogleWorkspaceClaims(
  claims: GoogleOidcClaims,
  input: {
    clientId: string
    expectedNonce: string
    allowedDomains: readonly string[]
    now?: Date
  }
): ValidatedGoogleIdentity {
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)
  const issuer = asNonEmptyString(claims.iss, "iss")
  if (
    issuer !== "https://accounts.google.com" &&
    issuer !== "accounts.google.com"
  ) {
    throw new Error("Google identity issuer is invalid.")
  }

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!audiences.includes(input.clientId)) {
    throw new Error("Google identity audience is invalid.")
  }

  const subject = asNonEmptyString(claims.sub, "sub")
  const email = asNonEmptyString(claims.email, "email").toLowerCase()
  if (claims.email_verified !== true) {
    throw new Error("Google Workspace email must be verified.")
  }

  const hostedDomain = asNonEmptyString(claims.hd, "hd").toLowerCase()
  const emailDomain = email.split("@")[1]
  const allowedDomains = input.allowedDomains.map((domain) =>
    domain.trim().toLowerCase()
  )
  if (
    !emailDomain ||
    emailDomain !== hostedDomain ||
    !allowedDomains.includes(hostedDomain)
  ) {
    throw new Error("Google Workspace domain is not allowed.")
  }

  const nonce = asNonEmptyString(claims.nonce, "nonce")
  if (!safeEqual(nonce, input.expectedNonce)) {
    throw new Error("Google identity nonce is invalid.")
  }

  if (typeof claims.exp !== "number" || claims.exp <= nowSeconds) {
    throw new Error("Google identity token is expired.")
  }
  if (typeof claims.iat === "number" && claims.iat > nowSeconds + 60) {
    throw new Error("Google identity token was issued in the future.")
  }

  return {
    subject,
    email,
    hostedDomain,
    fullName:
      typeof claims.name === "string" && claims.name.trim()
        ? claims.name.trim()
        : null,
  }
}

export function assertOidcState(
  receivedState: string,
  expectedStateHash: string
) {
  if (!safeEqual(hashOpaqueToken(receivedState), expectedStateHash)) {
    throw new Error("OIDC state validation failed.")
  }
}

export function encryptTransientSecret(secret: string, encryptionKey: string) {
  const key = createHash("sha256").update(encryptionKey, "utf8").digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ])
  return {
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
  }
}

export function decryptTransientSecret(
  encrypted: { ciphertext: string; iv: string; authTag: string },
  encryptionKey: string
) {
  const key = createHash("sha256").update(encryptionKey, "utf8").digest()
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encrypted.iv, "base64url")
  )
  decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function assertSessionActive(session: SessionState, now = new Date()) {
  if (session.revokedAt) {
    throw new Error("Session has been revoked.")
  }
  if (session.expiresAt <= now) {
    throw new Error("Session has expired.")
  }
}

export function assertMagicLinkUsable(
  invitation: MagicLinkState,
  rawToken: string,
  now = new Date()
) {
  if (!safeEqual(hashOpaqueToken(rawToken), invitation.tokenHash)) {
    throw new Error("Magic Link token is invalid.")
  }
  if (invitation.revokedAt) {
    throw new Error("Magic Link invitation has been revoked.")
  }
  if (invitation.expiresAt <= now) {
    throw new Error("Magic Link invitation has expired.")
  }
  if (invitation.failedAttempts >= invitation.maxAttempts) {
    throw new Error("Magic Link attempt limit has been reached.")
  }
  if (invitation.usePolicy === "OneTime" && invitation.useCount > 0) {
    throw new Error("Magic Link invitation has already been used.")
  }
}

export function assertRecentAuthentication(
  evidence: RecentAuthenticationState,
  input: {
    sessionHash: string
    now?: Date
    consumeOnce?: boolean
  }
) {
  const now = input.now ?? new Date()
  if (evidence.revokedAt || evidence.expiresAt <= now) {
    throw new Error("Recent authentication evidence is expired or revoked.")
  }
  if (
    !evidence.sessionHash ||
    !safeEqual(evidence.sessionHash, input.sessionHash)
  ) {
    throw new Error("Recent authentication is bound to another session.")
  }
  if (input.consumeOnce && evidence.consumedAt) {
    throw new Error("Recent authentication evidence has already been used.")
  }
}

export function classifyRoute(pathname: string): RouteAudience {
  if (
    pathname === "/sign-in" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/portal/access")
  ) {
    return "auth"
  }
  if (pathname.startsWith("/portal") || pathname.startsWith("/api/portal/")) {
    return "external"
  }
  if (pathname.startsWith("/verify") || pathname.startsWith("/api/verify/")) {
    return "public"
  }
  return "internal"
}

export function sanitizeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard"
  }
  if (classifyRoute(value) !== "internal") {
    return "/dashboard"
  }
  return value
}

export function resolveMappedRoles(input: {
  groupIds: readonly string[]
  mappings: readonly {
    groupId: string
    roleCode: string
    projectId?: string | null
    active: boolean
  }[]
  overrides?: readonly {
    roleCode: string
    projectId?: string | null
    active: boolean
  }[]
}) {
  const roles = new Map<
    string,
    { roleCode: string; projectId: string | null }
  >()
  const add = (roleCode: string, projectId?: string | null) => {
    const normalizedProject = projectId ?? null
    roles.set(`${roleCode}:${normalizedProject ?? "system"}`, {
      roleCode,
      projectId: normalizedProject,
    })
  }

  for (const mapping of input.mappings) {
    if (mapping.active && input.groupIds.includes(mapping.groupId)) {
      add(mapping.roleCode, mapping.projectId)
    }
  }
  for (const override of input.overrides ?? []) {
    if (override.active) add(override.roleCode, override.projectId)
  }
  return [...roles.values()]
}

export function signingEligibility(roleCodes: readonly string[]) {
  const roles = new Set(roleCodes)
  return {
    preparedByManager: roles.has("discipline_user"),
    reviewer: roles.has("reviewer"),
    approver: roles.has("approver"),
    dcValidator: roles.has("dtgsa_dc_admin") || roles.has("dtgsa_dc_user"),
    auditor: roles.has("super_admin") || roles.has("system_admin"),
  }
}

export class FakeWorkspaceDirectoryAdapter implements WorkspaceDirectoryAdapter {
  readonly calls: Array<{ cursor?: string; dryRun: boolean }> = []

  constructor(private readonly pages: DirectorySyncPage[]) {}

  async listUsers(input: {
    cursor?: string
    dryRun: boolean
  }): Promise<DirectorySyncPage> {
    this.calls.push(input)
    const index = input.cursor ? Number(input.cursor) : 0
    const page = this.pages[index] ?? { users: [] }
    return {
      ...page,
      nextCursor:
        page.nextCursor ??
        (index + 1 < this.pages.length ? String(index + 1) : undefined),
    }
  }
}
