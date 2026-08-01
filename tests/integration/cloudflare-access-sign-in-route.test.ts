import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import type { CloudflareAccessIdentity } from "../../apps/mdr-web/src/server/services/identity/cloudflare-access-service"
import {
  completeWorkforceSignIn,
  type WorkforceSignInDependencies,
} from "../../apps/mdr-web/src/server/services/identity/workforce-sign-in-route"
import { isLocalAcceptanceEnabled } from "../../apps/mdr-web/src/server/services/local/local-acceptance-access"
import { routeAudience } from "../../apps/mdr-web/src/lib/routing/route-audience"

const identity: CloudflareAccessIdentity = {
  email: "document.controller@dtgsa.com",
  subject: "cf-user-123",
  issuedAt: new Date("2026-08-01T08:00:00.000Z"),
  expiresAt: new Date("2026-08-01T16:00:00.000Z"),
}

function dependencies(
  overrides: Partial<WorkforceSignInDependencies> = {}
): WorkforceSignInDependencies {
  return {
    authMode: "CLOUDFLARE_ACCESS",
    verifyIdentity: async () => identity,
    signIn: async () => ({
      rawToken: "internal-session-token",
      csrfToken: "internal-csrf-token",
      expiresAt: new Date("2026-08-01T16:00:00.000Z"),
    }),
    isNotAuthorizedError: () => false,
    ...overrides,
  }
}

test("Cloudflare Access sign-in verifies the assertion and completes an internal session", async () => {
  let verifiedAssertion: string | null = null
  let signedInIdentity: CloudflareAccessIdentity | null = null
  const response = await completeWorkforceSignIn(
    {
      headers: new Headers({
        "cf-access-jwt-assertion": "signed-cloudflare-assertion",
        "cf-connecting-ip": "192.0.2.10",
        "user-agent": "integration-test",
      }),
    },
    dependencies({
      verifyIdentity: async (headers) => {
        verifiedAssertion = headers.get("cf-access-jwt-assertion")
        return identity
      },
      signIn: async (input) => {
        signedInIdentity = input.identity
        assert.ok(input.ipHash)
        assert.ok(input.userAgentHash)
        return {
          rawToken: "internal-session-token",
          csrfToken: "internal-csrf-token",
          expiresAt: new Date("2026-08-01T16:00:00.000Z"),
        }
      },
    })
  )

  assert.equal(response.redirectTo, "/dashboard")
  assert.equal(verifiedAssertion, "signed-cloudflare-assertion")
  assert.deepEqual(signedInIdentity, identity)
  assert.equal(response.completed.rawToken, "internal-session-token")
  assert.equal(response.completed.csrfToken, "internal-csrf-token")
  assert.doesNotMatch(response.redirectTo, /local-acceptance/i)
})

test("Cloudflare Access denial never renders or links to local acceptance", async () => {
  const response = await completeWorkforceSignIn(
    {
      headers: new Headers({ "cf-access-jwt-assertion": "invalid" }),
    },
    dependencies({
      verifyIdentity: async () => {
        throw new Error("invalid assertion")
      },
    })
  )

  assert.equal(
    response.redirectTo,
    "/access-denied?reason=identity-unavailable"
  )
  assert.doesNotMatch(response.redirectTo, /local-acceptance/i)

  const [denialPage, routeAdapter] = await Promise.all([
    readFile("apps/mdr-web/src/app/(auth)/access-denied/page.tsx", "utf8"),
    readFile("apps/mdr-web/src/app/(auth)/sign-in/route.ts", "utf8"),
  ])
  assert.doesNotMatch(denialPage, /local-acceptance/i)
  assert.doesNotMatch(denialPage, /api\/auth\/google/i)
  assert.match(routeAdapter, /response\.cookies\.set/)
  assert.match(routeAdapter, /INTERNAL_SESSION_COOKIE/)
  assert.match(routeAdapter, /INTERNAL_CSRF_COOKIE/)
  assert.match(routeAdapter, /headers: \{ location: result\.redirectTo \}/)
  assert.doesNotMatch(
    routeAdapter,
    /new URL\(result\.redirectTo, request\.url\)/
  )
})

test("production sign-out terminates the Cloudflare Access session", async () => {
  const signOutAction = await readFile(
    "apps/mdr-web/src/server/actions/auth.ts",
    "utf8"
  )

  assert.match(signOutAction, /signOutCurrentUser\(\)/)
  assert.match(signOutAction, /cookieStore\.delete\(INTERNAL_SESSION_COOKIE\)/)
  assert.match(signOutAction, /cookieStore\.delete\(INTERNAL_CSRF_COOKIE\)/)
  assert.match(signOutAction, /redirect\("\/cdn-cgi\/access\/logout"\)/)
  assert.doesNotMatch(signOutAction, /redirect\("\/sign-in"\)/)
})

test("production CSP permits only the configured Cloudflare analytics origin", async () => {
  const nextConfig = await readFile("apps/mdr-web/next.config.ts", "utf8")

  assert.match(
    nextConfig,
    /script-src 'self' 'unsafe-inline' https:\/\/static\.cloudflareinsights\.com/
  )
  assert.doesNotMatch(nextConfig, /script-src[^\n]*\shttps:\s/)
})

test("local acceptance is reachable only in an explicit non-production runtime", () => {
  assert.equal(
    isLocalAcceptanceEnabled({
      LOCAL_ACCEPTANCE_MODE: "true",
      NODE_ENV: "development",
    }),
    true
  )
  assert.equal(
    isLocalAcceptanceEnabled({
      LOCAL_ACCEPTANCE_MODE: "true",
      NODE_ENV: "production",
    }),
    false
  )
  assert.equal(
    isLocalAcceptanceEnabled({
      LOCAL_ACCEPTANCE_MODE: "false",
      NODE_ENV: "development",
    }),
    false
  )

  // Proxy must pass this path through so the page and POST handler can return
  // the production 404 instead of being intercepted by the sign-in redirect.
  assert.equal(routeAudience("/local-acceptance"), "auth")
  assert.equal(routeAudience("/local-acceptance/session"), "auth")
})

test("local mode redirects to the isolated selector without invoking Cloudflare", async () => {
  let verifierCalled = false
  const response = await completeWorkforceSignIn(
    { headers: new Headers() },
    dependencies({
      authMode: "LOCAL_ACCEPTANCE_IDENTITY",
      verifyIdentity: async () => {
        verifierCalled = true
        return identity
      },
    })
  )

  assert.equal(response.redirectTo, "/local-acceptance")
  assert.equal(verifierCalled, false)
})
