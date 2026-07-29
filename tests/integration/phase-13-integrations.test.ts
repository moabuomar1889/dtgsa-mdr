import assert from "node:assert/strict"
import test from "node:test"
import { createPrismaClient } from "@dtg/database"
import { hashSecret } from "@dtg/integration-domain"
import { createPlatformApiServer } from "../../apps/platform-api/src/server"

test("versioned API enforces scopes, boundaries, revocation, and idempotency", async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  process.env.DATABASE_URL = databaseUrl
  const { client: prisma } = createPrismaClient(databaseUrl)
  const suffix = Date.now().toString(36)
  const secret = `integration-secret-${suffix}-long-value`
  const integration = await prisma.integrationClient.create({
    data: {
      clientKey: `phase13-${suffix}`,
      name: "Phase 13 test client",
      secretHash: hashSecret(secret),
      projectIds: ["allowed-project"],
      rateLimitPerMinute: 100,
    },
  })
  await prisma.integrationScope.createMany({
    data: ["documents:read", "integrations:manage", "requests:write"].map(
      (scope) => ({ integrationClientId: integration.id, scope })
    ),
  })
  const server = createPlatformApiServer()
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  assert.ok(address && typeof address === "object")
  const base = `http://127.0.0.1:${address.port}`
  const authorization = `Bearer ${integration.clientKey}.${secret}`
  try {
    const openapi = await fetch(`${base}/api/v1/openapi.json`)
    assert.equal(openapi.status, 200)

    const unauthorized = await fetch(`${base}/api/v1/documents`)
    assert.equal(unauthorized.status, 401)

    const crossProject = await fetch(
      `${base}/api/v1/documents?projectId=other-project`,
      { headers: { authorization } }
    )
    assert.equal(crossProject.status, 403)

    const allowed = await fetch(
      `${base}/api/v1/documents?projectId=allowed-project`,
      { headers: { authorization } }
    )
    assert.equal(allowed.status, 200)
    assert.doesNotMatch(
      await allowed.text(),
      /googleDrive|storagePath|secretHash/
    )

    const mutation = {
      name: "Created by API",
      clientKey: `child-${suffix}`,
      scopes: ["documents:read"],
    }
    const first = await fetch(`${base}/api/v1/integrations`, {
      method: "POST",
      headers: {
        authorization,
        "content-type": "application/json",
        "idempotency-key": `phase13-${suffix}`,
      },
      body: JSON.stringify(mutation),
    })
    assert.equal(first.status, 201)
    const firstBody = await first.json()
    const replay = await fetch(`${base}/api/v1/integrations`, {
      method: "POST",
      headers: {
        authorization,
        "content-type": "application/json",
        "idempotency-key": `phase13-${suffix}`,
      },
      body: JSON.stringify(mutation),
    })
    assert.equal(replay.status, 201)
    assert.deepEqual((await replay.json()).data, firstBody.data)

    const conflict = await fetch(`${base}/api/v1/integrations`, {
      method: "POST",
      headers: {
        authorization,
        "content-type": "application/json",
        "idempotency-key": `phase13-${suffix}`,
      },
      body: JSON.stringify({ ...mutation, name: "Changed" }),
    })
    assert.equal(conflict.status, 409)

    await prisma.integrationClient.update({
      where: { id: integration.id },
      data: { isActive: false, revokedAt: new Date() },
    })
    const revoked = await fetch(`${base}/api/v1/documents`, {
      headers: { authorization },
    })
    assert.equal(revoked.status, 401)
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    )
    await prisma.$disconnect()
  }
})
