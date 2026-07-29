import assert from "node:assert/strict"
import { test } from "node:test"
import {
  AUTH_MODES,
  FakeWorkspaceDirectoryAdapter,
  assertAuthModeAllowed,
  assertMagicLinkUsable,
  assertOidcState,
  assertRecentAuthentication,
  assertSessionActive,
  classifyRoute,
  createPkcePair,
  decryptTransientSecret,
  encryptTransientSecret,
  hashOpaqueToken,
  issueOpaqueToken,
  resolveMappedRoles,
  sanitizeReturnTo,
  signingEligibility,
  validateGoogleWorkspaceClaims,
  type GoogleOidcClaims,
} from "../../packages/identity-domain/src/index"

const now = new Date("2026-07-29T12:00:00.000Z")
const nowSeconds = Math.floor(now.getTime() / 1000)
const claims: GoogleOidcClaims = {
  iss: "https://accounts.google.com",
  aud: "dtg-client",
  sub: "immutable-google-subject",
  email: "engineer@dtg.example",
  email_verified: true,
  hd: "dtg.example",
  nonce: "expected-nonce",
  exp: nowSeconds + 300,
  iat: nowSeconds - 10,
  name: "DTG Engineer",
}

function validate(overrides: Partial<GoogleOidcClaims> = {}) {
  return validateGoogleWorkspaceClaims(
    { ...claims, ...overrides },
    {
      clientId: "dtg-client",
      expectedNonce: "expected-nonce",
      allowedDomains: ["dtg.example"],
      now,
    }
  )
}

test("production permits only Google Workspace authentication", () => {
  assert.equal(
    assertAuthModeAllowed(AUTH_MODES.googleWorkspace, "production"),
    AUTH_MODES.googleWorkspace
  )
  assert.throws(
    () =>
      assertAuthModeAllowed(AUTH_MODES.localAcceptanceIdentity, "production"),
    /Production requires GOOGLE_WORKSPACE/
  )
})

test("development permits only the isolated local identity mode", () => {
  assert.equal(
    assertAuthModeAllowed(AUTH_MODES.localAcceptanceIdentity, "development"),
    AUTH_MODES.localAcceptanceIdentity
  )
})

test("OIDC state validation rejects browser-state mismatch", () => {
  const state = issueOpaqueToken()
  assert.doesNotThrow(() => assertOidcState(state, hashOpaqueToken(state)))
  assert.throws(
    () => assertOidcState(issueOpaqueToken(), hashOpaqueToken(state)),
    /state validation failed/
  )
})

test("Google Workspace claims accept an immutable subject and verified domain", () => {
  assert.deepEqual(validate(), {
    subject: "immutable-google-subject",
    email: "engineer@dtg.example",
    hostedDomain: "dtg.example",
    fullName: "DTG Engineer",
  })
})

test("Google Workspace claims reject a nonce mismatch", () => {
  assert.throws(() => validate({ nonce: "wrong" }), /nonce is invalid/)
})

test("Google Workspace claims reject an invalid issuer", () => {
  assert.throws(() => validate({ iss: "https://attacker.example" }), /issuer/)
})

test("Google Workspace claims reject an invalid audience", () => {
  assert.throws(() => validate({ aud: "other-client" }), /audience/)
})

test("Google Workspace claims reject an unverified email", () => {
  assert.throws(() => validate({ email_verified: false }), /must be verified/)
})

test("Google Workspace claims reject hosted-domain and email-domain mismatch", () => {
  assert.throws(
    () => validate({ email: "engineer@other.example" }),
    /domain is not allowed/
  )
})

test("Google Workspace claims reject a missing immutable subject", () => {
  assert.throws(() => validate({ sub: undefined }), /claim sub is required/)
})

test("Google Workspace claims reject expired and future-issued tokens", () => {
  assert.throws(() => validate({ exp: nowSeconds }), /token is expired/)
  assert.throws(
    () => validate({ iat: nowSeconds + 61 }),
    /issued in the future/
  )
})

test("PKCE challenge is derived from a high-entropy verifier", () => {
  const pair = createPkcePair()
  assert.ok(pair.verifier.length >= 64)
  assert.equal(pair.challenge, hashOpaqueToken(pair.verifier))
})

test("OIDC verifier encryption round-trips and rejects the wrong key", () => {
  const encrypted = encryptTransientSecret(
    "server-side-pkce-verifier",
    "a-secure-test-key-with-at-least-32-characters"
  )
  assert.equal(
    decryptTransientSecret(
      encrypted,
      "a-secure-test-key-with-at-least-32-characters"
    ),
    "server-side-pkce-verifier"
  )
  assert.throws(() =>
    decryptTransientSecret(encrypted, "a-different-test-key-with-32-characters")
  )
})

test("sessions reject expiration and revocation", () => {
  assert.doesNotThrow(() =>
    assertSessionActive({ expiresAt: new Date(now.getTime() + 1_000) }, now)
  )
  assert.throws(() => assertSessionActive({ expiresAt: now }, now), /expired/)
  assert.throws(
    () =>
      assertSessionActive(
        {
          expiresAt: new Date(now.getTime() + 1_000),
          revokedAt: now,
        },
        now
      ),
    /revoked/
  )
})

test("one-time Magic Links reject replay, expiration, revocation, and attempts", () => {
  const rawToken = issueOpaqueToken()
  const base = {
    tokenHash: hashOpaqueToken(rawToken),
    expiresAt: new Date(now.getTime() + 60_000),
    usePolicy: "OneTime" as const,
    useCount: 0,
    maxAttempts: 5,
    failedAttempts: 0,
  }
  assert.doesNotThrow(() => assertMagicLinkUsable(base, rawToken, now))
  assert.throws(
    () => assertMagicLinkUsable({ ...base, useCount: 1 }, rawToken, now),
    /already been used/
  )
  assert.throws(
    () => assertMagicLinkUsable({ ...base, expiresAt: now }, rawToken, now),
    /expired/
  )
  assert.throws(
    () => assertMagicLinkUsable({ ...base, revokedAt: now }, rawToken, now),
    /revoked/
  )
  assert.throws(
    () => assertMagicLinkUsable({ ...base, failedAttempts: 5 }, rawToken, now),
    /attempt limit/
  )
})

test("Magic Link verification never accepts a different raw token", () => {
  const rawToken = issueOpaqueToken()
  assert.throws(
    () =>
      assertMagicLinkUsable(
        {
          tokenHash: hashOpaqueToken(rawToken),
          expiresAt: new Date(now.getTime() + 60_000),
          usePolicy: "Reusable",
          useCount: 0,
          maxAttempts: 5,
          failedAttempts: 0,
        },
        issueOpaqueToken(),
        now
      ),
    /token is invalid/
  )
})

test("recent authentication is session-bound, expiring, and optionally single-use", () => {
  const sessionHash = hashOpaqueToken("session")
  const base = {
    authenticatedAt: now,
    expiresAt: new Date(now.getTime() + 60_000),
    sessionHash,
  }
  assert.doesNotThrow(() =>
    assertRecentAuthentication(base, { sessionHash, now })
  )
  assert.throws(
    () =>
      assertRecentAuthentication(base, {
        sessionHash: hashOpaqueToken("different"),
        now,
      }),
    /another session/
  )
  assert.throws(
    () =>
      assertRecentAuthentication(
        { ...base, expiresAt: now },
        { sessionHash, now }
      ),
    /expired or revoked/
  )
  assert.throws(
    () =>
      assertRecentAuthentication(
        { ...base, consumedAt: now },
        { sessionHash, now, consumeOnce: true }
      ),
    /already been used/
  )
})

test("route classification keeps employee, external, public, and auth surfaces isolated", () => {
  assert.equal(classifyRoute("/dashboard"), "internal")
  assert.equal(classifyRoute("/admin/identity"), "internal")
  assert.equal(classifyRoute("/portal/pdi"), "external")
  assert.equal(classifyRoute("/api/portal/pdi/export"), "external")
  assert.equal(classifyRoute("/verify/document"), "public")
  assert.equal(classifyRoute("/api/auth/google/callback"), "auth")
  assert.equal(classifyRoute("/portal/access"), "auth")
})

test("return destinations cannot cross into external, public, or protocol-relative routes", () => {
  assert.equal(
    sanitizeReturnTo("/projects/active?tab=files"),
    "/projects/active?tab=files"
  )
  assert.equal(sanitizeReturnTo("/portal/pdi"), "/dashboard")
  assert.equal(sanitizeReturnTo("/verify/document"), "/dashboard")
  assert.equal(sanitizeReturnTo("//attacker.example"), "/dashboard")
})

test("group and override mappings preserve system and project scope", () => {
  assert.deepEqual(
    resolveMappedRoles({
      groupIds: ["reviewers", "project-approvers"],
      mappings: [
        {
          groupId: "reviewers",
          roleCode: "reviewer",
          active: true,
        },
        {
          groupId: "project-approvers",
          roleCode: "approver",
          projectId: "project-a",
          active: true,
        },
        {
          groupId: "inactive",
          roleCode: "system_admin",
          active: false,
        },
      ],
      overrides: [
        {
          roleCode: "dtgsa_dc_user",
          projectId: "project-a",
          active: true,
        },
      ],
    }),
    [
      { roleCode: "reviewer", projectId: null },
      { roleCode: "approver", projectId: "project-a" },
      { roleCode: "dtgsa_dc_user", projectId: "project-a" },
    ]
  )
})

test("signing eligibility derives only from authorized platform roles", () => {
  assert.deepEqual(signingEligibility(["reviewer", "approver"]), {
    preparedByManager: false,
    reviewer: true,
    approver: true,
    dcValidator: false,
    auditor: false,
  })
  assert.equal(signingEligibility(["system_admin"]).auditor, true)
})

test("fake Directory adapter is deterministic and supports incremental pages", async () => {
  const adapter = new FakeWorkspaceDirectoryAdapter([
    {
      users: [
        {
          subject: "sub-1",
          primaryEmail: "one@dtg.example",
          fullName: "One",
          suspended: false,
          groups: ["reviewers"],
        },
      ],
    },
    {
      users: [
        {
          subject: "sub-2",
          primaryEmail: "two@dtg.example",
          fullName: "Two",
          suspended: true,
          groups: [],
        },
      ],
    },
  ])
  const first = await adapter.listUsers({ dryRun: true })
  const second = await adapter.listUsers({
    cursor: first.nextCursor,
    dryRun: true,
  })
  assert.equal(first.users[0]?.subject, "sub-1")
  assert.equal(first.nextCursor, "1")
  assert.equal(second.users[0]?.suspended, true)
  assert.deepEqual(adapter.calls, [
    { dryRun: true },
    { cursor: "1", dryRun: true },
  ])
})
