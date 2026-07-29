import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"

export const API_RESOURCES = [
  "documents",
  "revisions",
  "approval-cases",
  "approval-steps",
  "review-sessions",
  "comments",
  "client-submissions",
  "client-responses",
  "downloads",
  "verification",
  "general-requests",
  "integrations",
  "webhooks",
] as const

export const API_SCOPES = [
  "documents:read",
  "cases:read",
  "cases:write",
  "comments:write",
  "downloads:read",
  "verification:read",
  "responses:write",
  "requests:read",
  "requests:write",
  "integrations:manage",
  "webhooks:manage",
] as const

export type ApiScope = (typeof API_SCOPES)[number]

export const WEBHOOK_EVENTS = [
  "CASE_STARTED",
  "STEP_ACTIVE",
  "STEP_COMPLETED",
  "CASE_RETURNED",
  "CASE_REJECTED",
  "INTERNAL_APPROVAL_COMPLETED",
  "CLIENT_SUBMISSION_REGISTERED",
  "CLIENT_RESPONSE_REGISTERED",
  "CLIENT_FINAL_APPROVED",
  "FILE_READY",
  "TAMPER_DETECTED",
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export class IntegrationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message)
  }
}

export function issueClientSecret() {
  const secret = randomBytes(32).toString("base64url")
  return { secret, secretHash: hashSecret(secret) }
}

export function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex")
}

export function verifySecret(secret: string, expectedHash: string) {
  const actual = Buffer.from(hashSecret(secret), "hex")
  const expected = Buffer.from(expectedHash, "hex")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function parseBearerCredential(header?: string) {
  const match = /^Bearer ([A-Za-z0-9_-]{3,128})\.([A-Za-z0-9_-]{20,256})$/.exec(
    header ?? ""
  )
  if (!match) {
    throw new IntegrationError(
      "invalid_client",
      401,
      "A valid service-client credential is required."
    )
  }
  return { clientKey: match[1]!, secret: match[2]! }
}

export function assertScope(granted: readonly string[], required: ApiScope) {
  if (!granted.includes(required)) {
    throw new IntegrationError(
      "insufficient_scope",
      403,
      `The service client requires ${required}.`
    )
  }
}

export function assertResourceAccess(input: {
  allowedProjectIds: readonly string[]
  allowedClientIds: readonly string[]
  projectId?: string | null
  clientId?: string | null
}) {
  if (
    input.projectId &&
    input.allowedProjectIds.length > 0 &&
    !input.allowedProjectIds.includes(input.projectId)
  ) {
    throw new IntegrationError(
      "cross_project_denied",
      403,
      "The requested project is outside the service-client boundary."
    )
  }
  if (
    input.clientId &&
    input.allowedClientIds.length > 0 &&
    !input.allowedClientIds.includes(input.clientId)
  ) {
    throw new IntegrationError(
      "cross_client_denied",
      403,
      "The requested client is outside the service-client boundary."
    )
  }
}

export function canonicalRequestHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(sortJson(value)))
    .digest("hex")
}

export function assertIdempotent(
  existing: { requestHash: string; response?: unknown } | null,
  hash: string
) {
  if (existing && existing.requestHash !== hash) {
    throw new IntegrationError(
      "idempotency_payload_mismatch",
      409,
      "The idempotency key was already used with another payload."
    )
  }
  return existing?.response
}

export function signWebhook(secret: string, timestamp: string, body: string) {
  return `v1=${createHmac("sha256", secret)
    .update(`1.${timestamp}.${body}`)
    .digest("hex")}`
}

export function verifyWebhook(input: {
  secret: string
  timestamp: string
  body: string
  signature: string
  now?: number
  windowMs?: number
}) {
  const age = Math.abs((input.now ?? Date.now()) - Date.parse(input.timestamp))
  if (!Number.isFinite(age) || age > (input.windowMs ?? 300_000)) return false
  const expected = signWebhook(input.secret, input.timestamp, input.body)
  return (
    expected.length === input.signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature))
  )
}

export function encryptWebhookSecret(secret: string, encryptionKey: string) {
  const key = createHash("sha256").update(encryptionKey).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ])
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".")
}

export function decryptWebhookSecret(value: string, encryptionKey: string) {
  const [version, iv, tag, ciphertext] = value.split(".")
  if (version !== "v1" || !iv || !tag || !ciphertext) {
    throw new IntegrationError(
      "invalid_webhook_secret",
      500,
      "The webhook signing secret cannot be decrypted."
    )
  }
  const key = createHash("sha256").update(encryptionKey).digest()
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url")
  )
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function nextWebhookAttempt(
  attemptCount: number,
  now = new Date(),
  maxAttempts = 8
) {
  const deadLetter = attemptCount >= maxAttempts
  const delaySeconds = Math.min(3600, 2 ** Math.max(0, attemptCount - 1) * 15)
  return {
    deadLetter,
    nextAttemptAt: deadLetter
      ? null
      : new Date(now.getTime() + delaySeconds * 1000),
  }
}

export function assertWebhookUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new IntegrationError(
      "invalid_webhook_url",
      400,
      "The webhook URL is invalid."
    )
  }
  const host = url.hostname.toLowerCase()
  const blocked =
    url.protocol !== "https:" ||
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  if (blocked) {
    throw new IntegrationError(
      "unsafe_webhook_url",
      400,
      "Webhook endpoints must use public HTTPS destinations."
    )
  }
  return url.toString()
}

export type SafeField = {
  key: string
  label: string
  type: "text" | "number" | "date" | "boolean" | "select" | "textarea"
  required?: boolean
  options?: string[]
  maxLength?: number
}

export function validateFormDefinition(fields: SafeField[]) {
  const keys = new Set<string>()
  const types = new Set([
    "text",
    "number",
    "date",
    "boolean",
    "select",
    "textarea",
  ])
  if (fields.length === 0 || fields.length > 100) {
    throw new IntegrationError(
      "invalid_form_definition",
      400,
      "A form must contain between 1 and 100 fields."
    )
  }
  for (const field of fields) {
    if (
      !/^[a-z][a-z0-9_]{0,63}$/.test(field.key) ||
      keys.has(field.key) ||
      !field.label.trim() ||
      !types.has(field.type)
    ) {
      throw new IntegrationError(
        "invalid_form_field",
        400,
        "Form keys and labels must be unique and safe."
      )
    }
    if (
      field.type === "select" &&
      (!field.options ||
        field.options.length === 0 ||
        field.options.length > 50)
    ) {
      throw new IntegrationError(
        "select_options_required",
        400,
        "Select fields require a bounded options list."
      )
    }
    if (field.maxLength && (field.maxLength < 1 || field.maxLength > 10_000)) {
      throw new IntegrationError(
        "invalid_max_length",
        400,
        "Field length limits must be between 1 and 10000."
      )
    }
    keys.add(field.key)
  }
  return fields
}

export function validateFormSubmission(
  fields: SafeField[],
  data: Record<string, unknown>
) {
  validateFormDefinition(fields)
  const allowed = new Map(fields.map((field) => [field.key, field]))
  for (const key of Object.keys(data)) {
    if (!allowed.has(key)) {
      throw new IntegrationError(
        "unknown_form_field",
        400,
        `Unknown form field: ${key}.`
      )
    }
  }
  for (const field of fields) {
    const value = data[field.key]
    if (
      field.required &&
      (value === undefined || value === null || value === "")
    ) {
      throw new IntegrationError(
        "required_form_field",
        400,
        `${field.label} is required.`
      )
    }
    if (value === undefined || value === null || value === "") continue
    if (field.type === "number" && typeof value !== "number") {
      throw new IntegrationError("invalid_field_type", 400, field.key)
    }
    if (field.type === "boolean" && typeof value !== "boolean") {
      throw new IntegrationError("invalid_field_type", 400, field.key)
    }
    if (
      ["text", "textarea", "date", "select"].includes(field.type) &&
      typeof value !== "string"
    ) {
      throw new IntegrationError("invalid_field_type", 400, field.key)
    }
    if (
      typeof value === "string" &&
      field.maxLength &&
      value.length > field.maxLength
    ) {
      throw new IntegrationError("field_too_long", 400, field.key)
    }
    if (field.type === "select" && !field.options?.includes(String(value))) {
      throw new IntegrationError("invalid_select_option", 400, field.key)
    }
  }
  return data
}

export const GENERAL_REQUEST_TEMPLATES = [
  {
    code: "LEAVE",
    name: "Leave",
    departmentOwner: "HR",
    fields: [
      {
        key: "leave_type",
        label: "Leave type",
        type: "select",
        required: true,
        options: ["Annual", "Sick", "Unpaid"],
      },
      { key: "start_date", label: "Start date", type: "date", required: true },
      { key: "end_date", label: "End date", type: "date", required: true },
      { key: "reason", label: "Reason", type: "textarea", maxLength: 2000 },
    ],
  },
  {
    code: "EMPLOYEE_ADVANCE",
    name: "Employee advance",
    departmentOwner: "Accounting",
    fields: [
      { key: "amount", label: "Amount", type: "number", required: true },
      {
        key: "reason",
        label: "Reason",
        type: "textarea",
        required: true,
        maxLength: 2000,
      },
    ],
  },
  {
    code: "BUSINESS_TRIP",
    name: "Business trip",
    departmentOwner: "HR",
    fields: [
      {
        key: "destination",
        label: "Destination",
        type: "text",
        required: true,
        maxLength: 200,
      },
      { key: "start_date", label: "Start date", type: "date", required: true },
      { key: "end_date", label: "End date", type: "date", required: true },
      {
        key: "purpose",
        label: "Purpose",
        type: "textarea",
        required: true,
        maxLength: 2000,
      },
    ],
  },
  {
    code: "OVERTIME",
    name: "Overtime",
    departmentOwner: "HR",
    fields: [
      { key: "date", label: "Date", type: "date", required: true },
      { key: "hours", label: "Hours", type: "number", required: true },
      {
        key: "reason",
        label: "Reason",
        type: "textarea",
        required: true,
        maxLength: 2000,
      },
    ],
  },
  {
    code: "ASSET_REQUEST",
    name: "Asset request",
    departmentOwner: "Procurement",
    fields: [
      {
        key: "asset",
        label: "Asset",
        type: "text",
        required: true,
        maxLength: 200,
      },
      {
        key: "justification",
        label: "Justification",
        type: "textarea",
        required: true,
        maxLength: 2000,
      },
    ],
  },
  {
    code: "EMPLOYEE_ACKNOWLEDGEMENT",
    name: "Employee acknowledgement",
    departmentOwner: "HR",
    fields: [
      {
        key: "subject",
        label: "Subject",
        type: "text",
        required: true,
        maxLength: 200,
      },
      {
        key: "acknowledged",
        label: "I acknowledge",
        type: "boolean",
        required: true,
      },
    ],
  },
  {
    code: "ADMINISTRATIVE_APPROVAL",
    name: "General administrative approval",
    departmentOwner: "Administration",
    fields: [
      {
        key: "subject",
        label: "Subject",
        type: "text",
        required: true,
        maxLength: 200,
      },
      {
        key: "details",
        label: "Details",
        type: "textarea",
        required: true,
        maxLength: 5000,
      },
    ],
  },
] satisfies Array<{
  code: string
  name: string
  departmentOwner: string
  fields: SafeField[]
}>

export function buildApprovalDeepLink(
  origin: string,
  caseId: string,
  returnUrl?: string
) {
  const url = new URL("/", origin)
  url.searchParams.set("case", caseId)
  if (returnUrl) url.searchParams.set("return", returnUrl)
  return url.toString()
}

export function createGeneralRequestSummary(input: {
  requestNumber: string
  typeName: string
  departmentOwner: string
  purpose: string
  fields: Record<string, unknown>
}) {
  const lines = [
    "DTG Signature Platform",
    "General Request Summary",
    `Request: ${input.requestNumber}`,
    `Type: ${input.typeName}`,
    `Department: ${input.departmentOwner}`,
    `Purpose: ${input.purpose}`,
    ...Object.entries(input.fields).map(
      ([key, value]) => `${key}: ${String(value)}`
    ),
  ].map((line) => line.replace(/[^\x20-\x7E]/g, "?").slice(0, 110))
  const commands = lines
    .map(
      (line, index) =>
        `BT /F1 10 Tf 48 ${770 - index * 18} Td (${escapePdf(line)}) Tj ET`
    )
    .join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]
  let pdf = "%PDF-1.4\n"
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf)
}

export function publicIntegrationRecord<T extends Record<string, unknown>>(
  record: T
): Record<string, unknown> {
  const blocked = new Set([
    "secretHash",
    "encryptedSecret",
    "previousSecretHash",
    "googleDriveFileId",
    "googleDriveFolderId",
    "storagePath",
    "identitySnapshot",
    "requestMetadata",
    "internalComments",
    "approvalEvidence",
  ])
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (!blocked.has(key)) result[key] = sanitizeIntegrationValue(value)
  }
  return result
}

function sanitizeIntegrationValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString()
  if (Array.isArray(value)) return value.map(sanitizeIntegrationValue)
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return publicIntegrationRecord(value as Record<string, unknown>)
  }
  return value
}

function escapePdf(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortJson(item)])
    )
  }
  return value
}
