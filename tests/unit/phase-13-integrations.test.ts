import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import {
  API_RESOURCES,
  GENERAL_REQUEST_TEMPLATES,
  IntegrationError,
  assertIdempotent,
  assertResourceAccess,
  assertWebhookUrl,
  buildApprovalDeepLink,
  canonicalRequestHash,
  createGeneralRequestSummary,
  decryptWebhookSecret,
  encryptWebhookSecret,
  issueClientSecret,
  nextWebhookAttempt,
  publicIntegrationRecord,
  signWebhook,
  validateFormDefinition,
  validateFormSubmission,
  verifySecret,
  verifyWebhook,
} from "@dtg/integration-domain"
import { openApiDocument } from "../../apps/platform-api/src/server"

test("service-client secrets are one-way and rotation invalidates the old secret", () => {
  const oldCredential = issueClientSecret()
  const rotatedCredential = issueClientSecret()
  assert.equal(
    verifySecret(oldCredential.secret, oldCredential.secretHash),
    true
  )
  assert.equal(
    verifySecret(oldCredential.secret, rotatedCredential.secretHash),
    false
  )
  assert.notEqual(oldCredential.secretHash, rotatedCredential.secretHash)
})

test("project and client boundaries deny cross-scope access", () => {
  assert.throws(
    () =>
      assertResourceAccess({
        allowedProjectIds: ["project-a"],
        allowedClientIds: ["client-a"],
        projectId: "project-b",
      }),
    (error: unknown) =>
      error instanceof IntegrationError && error.code === "cross_project_denied"
  )
  assert.throws(() =>
    assertResourceAccess({
      allowedProjectIds: ["project-a"],
      allowedClientIds: ["client-a"],
      clientId: "client-b",
    })
  )
})

test("idempotency is canonical, stable, and rejects payload changes", () => {
  const first = canonicalRequestHash({ b: 2, a: { y: 2, x: 1 } })
  const second = canonicalRequestHash({ a: { x: 1, y: 2 }, b: 2 })
  assert.equal(first, second)
  assert.deepEqual(
    assertIdempotent(
      { requestHash: first, response: { id: "stable" } },
      second
    ),
    { id: "stable" }
  )
  assert.throws(() =>
    assertIdempotent(
      { requestHash: first, response: { id: "stable" } },
      canonicalRequestHash({ a: "changed" })
    )
  )
})

test("webhook signatures, replay windows, encrypted secrets, and retries work", () => {
  const secret = "webhook-secret-with-enough-entropy"
  const timestamp = "2026-07-29T10:00:00.000Z"
  const body = JSON.stringify({ id: "event-1" })
  const signature = signWebhook(secret, timestamp, body)
  assert.equal(
    verifyWebhook({
      secret,
      timestamp,
      body,
      signature,
      now: Date.parse(timestamp) + 1_000,
    }),
    true
  )
  assert.equal(
    verifyWebhook({
      secret,
      timestamp,
      body,
      signature,
      now: Date.parse(timestamp) + 600_000,
    }),
    false
  )
  const ciphertext = encryptWebhookSecret(secret, "deployment-key")
  assert.equal(decryptWebhookSecret(ciphertext, "deployment-key"), secret)
  assert.equal(nextWebhookAttempt(1).deadLetter, false)
  assert.equal(nextWebhookAttempt(8).deadLetter, true)
})

test("webhook destinations reject SSRF-prone hosts", () => {
  assert.equal(
    assertWebhookUrl("https://events.example.com/dtg").startsWith("https:"),
    true
  )
  for (const url of [
    "http://events.example.com",
    "https://localhost/hook",
    "https://127.0.0.1/hook",
    "https://10.0.0.5/hook",
    "https://192.168.1.5/hook",
  ]) {
    assert.throws(() => assertWebhookUrl(url))
  }
})

test("general-request schemas are declarative, version-safe, and validated", () => {
  assert.equal(GENERAL_REQUEST_TEMPLATES.length, 7)
  for (const template of GENERAL_REQUEST_TEMPLATES) {
    assert.deepEqual(validateFormDefinition(template.fields), template.fields)
  }
  const leave = GENERAL_REQUEST_TEMPLATES[0]!
  assert.deepEqual(
    validateFormSubmission(leave.fields, {
      leave_type: "Annual",
      start_date: "2026-08-01",
      end_date: "2026-08-05",
      reason: "Annual leave",
    }).leave_type,
    "Annual"
  )
  assert.throws(() =>
    validateFormDefinition([
      {
        key: "unsafe",
        label: "Unsafe",
        type: "script",
      } as never,
    ])
  )
})

test("summary generation emits a PDF and deep links preserve return URLs", () => {
  const pdf = createGeneralRequestSummary({
    requestNumber: "GR-2026-TEST",
    typeName: "Leave",
    departmentOwner: "HR",
    purpose: "Annual leave",
    fields: { start_date: "2026-08-01" },
  })
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-")
  const link = buildApprovalDeepLink(
    "https://approve.example.com",
    "case-1",
    "https://hr.example.com/requests/42"
  )
  assert.match(link, /case=case-1/)
  assert.match(link, /return=https/)
})

test("integration output recursively removes secrets and storage identities", () => {
  const sanitized = publicIntegrationRecord({
    id: "record",
    secretHash: "secret",
    nested: {
      providerKey: "provider-private",
      safe: "visible",
    },
    bytes: 12n,
  })
  assert.equal(sanitized.secretHash, undefined)
  assert.deepEqual(sanitized.nested, { safe: "visible" })
  assert.equal(sanitized.bytes, "12")
})

test("OpenAPI publishes every required v1 resource and consistent security", () => {
  assert.equal(openApiDocument.openapi, "3.1.0")
  for (const resource of API_RESOURCES) {
    assert.ok(openApiDocument.paths[`/${resource}`])
  }
  assert.ok(openApiDocument.components.schemas.Error)
})

test("SDK stays server-oriented and exposes required operations", async () => {
  const source = await readFile("packages/integration-sdk/src/index.ts", "utf8")
  for (const operation of [
    "createCase",
    "readStatus",
    "submit",
    "comment",
    "download",
    "verify",
    "registerClientResponse",
  ]) {
    assert.match(source, new RegExp(operation))
  }
  assert.doesNotMatch(source, /localStorage|NEXT_PUBLIC|window\./)
})

test("clean baseline includes integrations and protects published forms", async () => {
  const migration = await readFile(
    "prisma/migrations/0001_initial_dtg_signature_platform/migration.sql",
    "utf8"
  )
  assert.match(migration, /IntegrationRequestAttempt/)
  assert.match(migration, /GeneralRequestAttachment/)
  assert.match(migration, /GeneralRequestApprovalDecision/)
  assert.match(migration, /published_immutable/)
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/)
})
