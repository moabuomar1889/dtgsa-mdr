import { createHash, createPublicKey, verify } from "node:crypto"
import {
  DEFAULT_PUBLIC_FIELDS,
  VERIFICATION_MESSAGES,
  genericLookupFailure,
  hashesMatch,
  hashVerificationCode,
  sanitizePublicVerification,
  type PublicVerificationFields,
  type VerificationResult,
} from "@dtg/verification-domain"
import { prisma } from "./db"

const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 20

function fingerprint(value: string) {
  const secret =
    process.env.VERIFICATION_FINGERPRINT_SECRET ??
    process.env.CRON_SECRET ??
    "local-verification-only"
  if (
    process.env.NODE_ENV === "production" &&
    secret === "local-verification-only"
  ) {
    throw new Error("VERIFICATION_FINGERPRINT_SECRET is required.")
  }
  return createHash("sha256").update(`${secret}:${value}`).digest("hex")
}

function policyFields(value: unknown): PublicVerificationFields {
  if (!value || typeof value !== "object") return DEFAULT_PUBLIC_FIELDS
  const source = value as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(DEFAULT_PUBLIC_FIELDS).map(([key, fallback]) => [
      key,
      typeof source[key] === "boolean" ? source[key] : fallback,
    ])
  ) as PublicVerificationFields
}

async function expectedTargetHash(input: {
  targetType: string
  targetId: string | null
  revisionId: string
  packageHash: string | null
}) {
  switch (input.targetType) {
    case "CONTROLLED_MAIN":
      return (
        await prisma.controlledMainFile.findFirst({
          where: {
            revisionId: input.revisionId,
            isActive: true,
          },
          include: { fileObject: true },
          orderBy: { controlledAt: "desc" },
        })
      )?.fileObject.checksum
    case "CLIENT_RESPONSE_FILE":
      return input.targetId
        ? (
            await prisma.fileObject.findUnique({
              where: { id: input.targetId },
            })
          )?.checksum
        : null
    case "GENERATED_ARTIFACT":
      return input.targetId
        ? (
            await prisma.generatedArtifactRecord.findUnique({
              where: { id: input.targetId },
            })
          )?.artifactSha256
        : null
    default:
      return input.packageHash
  }
}

async function sealStatus(manifestId: string, canonicalBytes: Buffer | null) {
  const seal = await prisma.platformSeal.findFirst({
    where: { manifestId },
    orderBy: { sealedAt: "desc" },
  })
  if (!seal) return { status: "LEGACY_UNVERIFIABLE" as VerificationResult }
  const key = await prisma.signingKeyRegistry.findUnique({
    where: { keyId: seal.keyId },
  })
  if (!key) return { status: "UNKNOWN_KEY" as VerificationResult }
  if (key.status === "REVOKED") {
    return { status: "REVOKED_KEY" as VerificationResult }
  }
  if (!canonicalBytes || seal.signedPayloadVersion !== "1") {
    return { status: "UNSUPPORTED_VERSION" as VerificationResult }
  }
  try {
    const valid = verify(
      null,
      canonicalBytes,
      createPublicKey(key.publicKeyPem),
      seal.signature
    )
    return {
      status: (valid ? "VALID" : "INVALID_SEAL") as VerificationResult,
      algorithm: seal.algorithm,
      keyId: seal.keyId,
      keyStatus: key.status,
      payloadVersion: seal.signedPayloadVersion,
    }
  } catch {
    return { status: "INVALID_SEAL" as VerificationResult }
  }
}

export async function verifyPublicCode(input: {
  code: string
  observedHash?: string
  requestFingerprint: string
}) {
  const codeHash = hashVerificationCode(input.code)
  const requestFingerprintHash = fingerprint(input.requestFingerprint)
  const recentAttempts = await prisma.verificationAttempt.count({
    where: {
      requestFingerprintHash,
      createdAt: { gte: new Date(Date.now() - WINDOW_MS) },
    },
  })
  if (recentAttempts >= MAX_ATTEMPTS) return genericLookupFailure()

  const code = await prisma.verificationCode.findUnique({
    where: { codeHash },
  })
  if (
    !code ||
    code.revokedAt ||
    (code.expiresAt && code.expiresAt <= new Date())
  ) {
    await prisma.verificationAttempt.create({
      data: {
        codeHash,
        requestFingerprintHash,
        resultCode: "INVALID_HASH",
      },
    })
    return genericLookupFailure()
  }

  const manifest = await prisma.packageManifest.findUnique({
    where: { id: code.manifestId },
    include: {
      hashes: true,
      revision: {
        include: {
          document: {
            include: { project: { include: { client: true } } },
          },
        },
      },
    },
  })
  if (!manifest) return genericLookupFailure()
  const packageHash =
    manifest.hashes.find((hash) => hash.algorithm.toUpperCase() === "SHA-256")
      ?.value ??
    manifest.manifestDigest ??
    null
  let status: VerificationResult = "VALID"
  if (manifest.schemaVersion !== "1" && manifest.schemaVersion !== "phase-11") {
    status = "UNSUPPORTED_VERSION"
  } else if (
    manifest.canonicalBytes &&
    packageHash &&
    !hashesMatch(
      packageHash,
      createHash("sha256").update(manifest.canonicalBytes).digest("hex")
    )
  ) {
    status = "INVALID_MANIFEST"
  }
  const expectedHash = await expectedTargetHash({
    targetType: code.targetType,
    targetId: code.targetId,
    revisionId: manifest.revisionId,
    packageHash,
  })
  if (!expectedHash) status = "MISSING_FILE"
  if (
    input.observedHash &&
    expectedHash &&
    !hashesMatch(expectedHash, input.observedHash)
  ) {
    status = "TAMPER_DETECTED"
  }
  const seal = await sealStatus(
    manifest.id,
    manifest.canonicalBytes ? Buffer.from(manifest.canonicalBytes) : null
  )
  if (status === "VALID" && seal.status !== "VALID") status = seal.status

  const [response, approvalCount, policy] = await Promise.all([
    prisma.clientResponse.findFirst({
      where: { revisionId: manifest.revisionId, isActive: true },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.approvalEvidence.count({
      where: {
        approvalCycleId: {
          in: (
            await prisma.approvalCycle.findMany({
              where: { revisionId: manifest.revisionId },
              select: { id: true },
            })
          ).map((cycle) => cycle.id),
        },
      },
    }),
    prisma.publicVerificationPolicy.findFirst({
      where: {
        isActive: true,
        OR: [
          { projectId: manifest.revision.document.projectId },
          { projectId: null },
        ],
      },
      orderBy: [{ projectId: "desc" }, { version: "desc" }],
    }),
  ])
  const source = {
    status,
    reason: VERIFICATION_MESSAGES[status],
    targetType: code.targetType,
    documentNumber: manifest.revision.document.dtgsaDocumentNumber,
    revision: manifest.revision.revisionLabel,
    client: manifest.revision.document.project.client.name,
    project: manifest.revision.document.project.name,
    internalApprovalStatus: approvalCount > 0 ? "Recorded" : "Not recorded",
    clientResponseStatus:
      response?.labelSnapshot ?? response?.outcomeClass ?? "No response",
    finalApprovalStatus:
      response?.outcomeClass === "FINAL_APPROVED" ? "Final" : "Not final",
    completionDate:
      manifest.revision.closedAt?.toISOString() ??
      manifest.revision.updatedAt.toISOString(),
    packageMatch: input.observedHash ? status === "VALID" : null,
  }
  await prisma.$transaction([
    prisma.verificationAttempt.create({
      data: {
        codeHash,
        requestFingerprintHash,
        resultCode: status,
        targetType: code.targetType,
      },
    }),
    prisma.verificationRecord.create({
      data: {
        manifestId: manifest.id,
        result: status === "VALID" ? "Verified" : "TamperDetected",
        checkedHashes: {
          targetType: code.targetType,
          expectedHash,
          observedHash: input.observedHash ?? null,
          result: status,
        },
        requestFingerprintHash,
      },
    }),
  ])
  return {
    ...sanitizePublicVerification(source, policyFields(policy?.fields)),
    seal: {
      algorithm: seal.algorithm ?? null,
      keyId: seal.keyId ?? null,
      keyStatus: seal.keyStatus ?? null,
      payloadVersion: seal.payloadVersion ?? null,
      pades: false,
    },
  }
}
