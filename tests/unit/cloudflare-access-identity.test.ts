import assert from "node:assert/strict"
import { test } from "node:test"
import {
  AUTH_MODES,
  assertAuthModeAllowed,
  assertWorkforceEmailDomain,
  normalizeWorkforceEmail,
  workforceEmailDomain,
} from "../../packages/identity-domain/src/index"

test("Cloudflare Access is an accepted production identity provider", () => {
  assert.equal(
    assertAuthModeAllowed(AUTH_MODES.cloudflareAccess, "production"),
    "CLOUDFLARE_ACCESS"
  )
})

test("local acceptance identity is still refused in production", () => {
  assert.throws(
    () => assertAuthModeAllowed(AUTH_MODES.localAcceptanceIdentity, "production"),
    /Production requires/
  )
})

test("an unknown identity provider is refused outright", () => {
  assert.throws(
    () =>
      assertAuthModeAllowed(
        "PASSWORD" as unknown as typeof AUTH_MODES.cloudflareAccess,
        "development"
      ),
    /not supported/
  )
})

test("workforce email normalization strips whitespace and lowercases", () => {
  assert.equal(
    normalizeWorkforceEmail("  MO.Abuomar@DTGSA.com "),
    "mo.abuomar@dtgsa.com"
  )
  assert.equal(normalizeWorkforceEmail("not-an-email"), null)
  assert.equal(normalizeWorkforceEmail(undefined), null)
  assert.equal(normalizeWorkforceEmail(42), null)
})

test("the domain is taken after the final @, never by substring", () => {
  assert.equal(workforceEmailDomain("a@b@dtgsa.com"), "dtgsa.com")

  // A lookalike domain must not pass because it contains the allowed one.
  assert.throws(
    () => assertWorkforceEmailDomain("attacker@notdtgsa.com", "dtgsa.com"),
    /outside the workforce domain/
  )
  assert.throws(
    () => assertWorkforceEmailDomain("attacker@dtgsa.com.evil.tld", "dtgsa.com"),
    /outside the workforce domain/
  )
  assert.equal(
    assertWorkforceEmailDomain("mo.abuomar@dtgsa.com", "dtgsa.com"),
    "mo.abuomar@dtgsa.com"
  )
})
