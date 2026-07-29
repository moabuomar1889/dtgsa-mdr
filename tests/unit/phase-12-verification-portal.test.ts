import assert from "node:assert/strict"
import test from "node:test"
import {
  DEFAULT_PUBLIC_FIELDS,
  genericLookupFailure,
  hashesMatch,
  hashVerificationCode,
  issueUnpredictableVerificationCode,
  sanitizePublicVerification,
} from "@dtg/verification-domain"

test("verification codes are unpredictable and only hashes are persisted", () => {
  const values = Array.from({ length: 100 }, () =>
    issueUnpredictableVerificationCode()
  )
  assert.equal(new Set(values.map((value) => value.code)).size, 100)
  assert.ok(values.every((value) => value.code.length >= 22))
  assert.ok(values.every((value) => value.codeHash.length === 64))
  assert.equal(hashVerificationCode(values[0]!.code), values[0]!.codeHash)
})

test("local hash comparison detects one modified byte", () => {
  const expected = "a".repeat(64)
  assert.equal(hashesMatch(expected, expected), true)
  assert.equal(hashesMatch(expected, `${"a".repeat(63)}b`), false)
  assert.equal(hashesMatch(expected, "not-a-hash"), false)
})

test("public verification returns only explicitly allowlisted fields", () => {
  const result = sanitizePublicVerification(
    {
      status: "VALID",
      reason: "Matched",
      targetType: "CONTROLLED_MAIN",
      documentNumber: "DTG-001",
      revision: "02",
      client: "Secret Client",
      project: "Secret Project",
      internalApprovalStatus: "Recorded",
      clientResponseStatus: "Final",
      finalApprovalStatus: "Final",
      completionDate: "2026-07-29",
      packageMatch: true,
      email: "private@example.invalid",
      driveFileId: "private-drive-id",
      comments: "private comment",
      ipAddress: "127.0.0.1",
    },
    DEFAULT_PUBLIC_FIELDS
  )
  assert.equal(result.documentNumber, "DTG-001")
  assert.equal(result.client, undefined)
  assert.equal(result.project, undefined)
  assert.equal(result.email, undefined)
  assert.equal(result.driveFileId, undefined)
  assert.equal(result.comments, undefined)
  assert.equal(result.ipAddress, undefined)
})

test("unknown and revoked lookups share an enumeration-resistant response", () => {
  assert.deepEqual(genericLookupFailure(), genericLookupFailure())
  assert.equal(genericLookupFailure().status, "INVALID_HASH")
})
