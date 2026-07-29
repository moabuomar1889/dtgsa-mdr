import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export const VERIFICATION_RESULTS = [
  "VALID",
  "INVALID_HASH",
  "INVALID_MANIFEST",
  "INVALID_SEAL",
  "UNKNOWN_KEY",
  "REVOKED_KEY",
  "MISSING_FILE",
  "TAMPER_DETECTED",
  "UNSUPPORTED_VERSION",
  "LEGACY_UNVERIFIABLE",
] as const

export type VerificationResult = (typeof VERIFICATION_RESULTS)[number]

export const VERIFICATION_TARGETS = [
  "CONTROLLED_MAIN",
  "PACKAGE_MANIFEST",
  "INTERNAL_APPROVAL",
  "PLATFORM_SEAL",
  "CLIENT_RESPONSE_FILE",
  "GENERATED_ARTIFACT",
] as const

export type VerificationTarget = (typeof VERIFICATION_TARGETS)[number]

export function issueUnpredictableVerificationCode(bytes = 24) {
  if (bytes < 16) throw new Error("Verification codes require 128 bits.")
  const code = randomBytes(bytes).toString("base64url")
  return { code, codeHash: hashVerificationCode(code) }
}

export function hashVerificationCode(code: string) {
  return createHash("sha256")
    .update(code.trim().normalize("NFKC"), "utf8")
    .digest("hex")
}

export function hashesMatch(expected: string, observed: string) {
  if (!/^[a-f0-9]{64}$/i.test(expected) || !/^[a-f0-9]{64}$/i.test(observed)) {
    return false
  }
  return timingSafeEqual(
    Buffer.from(expected.toLowerCase(), "hex"),
    Buffer.from(observed.toLowerCase(), "hex")
  )
}

export type PublicVerificationFields = {
  documentNumber: boolean
  revision: boolean
  client: boolean
  project: boolean
  internalApprovalStatus: boolean
  clientResponseStatus: boolean
  finalApprovalStatus: boolean
  completionDate: boolean
  packageMatch: boolean
}

export const DEFAULT_PUBLIC_FIELDS: PublicVerificationFields = {
  documentNumber: true,
  revision: true,
  client: false,
  project: false,
  internalApprovalStatus: true,
  clientResponseStatus: true,
  finalApprovalStatus: true,
  completionDate: true,
  packageMatch: true,
}

export function sanitizePublicVerification(
  source: Record<string, unknown>,
  fields: PublicVerificationFields = DEFAULT_PUBLIC_FIELDS
) {
  const result: Record<string, unknown> = {
    status: source.status,
    reason: source.reason,
    targetType: source.targetType,
  }
  for (const [field, allowed] of Object.entries(fields)) {
    if (allowed && field in source) result[field] = source[field]
  }
  return result
}

export function genericLookupFailure(): Record<string, unknown> {
  return {
    status: "INVALID_HASH",
    reason: "The code or supplied file hash could not be verified.",
    targetType: null,
  }
}

export const VERIFICATION_MESSAGES: Record<VerificationResult, string> = {
  VALID: "The selected evidence matches the platform record.",
  INVALID_HASH: "The supplied hash does not match the recorded evidence.",
  INVALID_MANIFEST: "The package manifest does not match its recorded hash.",
  INVALID_SEAL: "The platform seal signature is invalid.",
  UNKNOWN_KEY: "The signing key is unknown.",
  REVOKED_KEY: "The signing key has been revoked.",
  MISSING_FILE: "Required file evidence is missing.",
  TAMPER_DETECTED: "Modified content was detected.",
  UNSUPPORTED_VERSION: "The evidence version is not supported.",
  LEGACY_UNVERIFIABLE: "Legacy visible signatures cannot be verified.",
}
