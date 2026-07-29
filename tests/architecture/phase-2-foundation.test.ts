import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import {
  hasAnyPermission as compatibilityHasAnyPermission,
  ROLE_CODES as compatibilityRoleCodes,
} from "@/lib/permissions/rbac"
import {
  getNextRevisionLabel as compatibilityNextRevision,
  resolveReplyState as compatibilityReplyState,
} from "@/server/services/replies/client-reply-policy"
import {
  hasAnyPermission,
  ROLE_CODES,
} from "@dtg/authorization"
import {
  getNextRevisionLabel,
  resolveReplyState,
} from "@dtg/document-control-domain"
import {
  getApproveHealth,
  getApproveReadiness,
} from "../../apps/approve-web/src/operational"
import { createPlatformApiServer } from "../../apps/platform-api/src/server"
import {
  getVerifyHealth,
  getVerifyReadiness,
} from "../../apps/verify-web/src/operational"
import { createWorkerRuntime } from "../../apps/worker/src/runtime"

const repositoryRoot = process.cwd()

test("workspace packages resolve through their public exports", async () => {
  const contracts = await import("@dtg/contracts")
  const configuration = await import("@dtg/configuration")
  const database = await import("@dtg/database")
  const observability = await import("@dtg/observability")
  const pdfEngine = await import("@dtg/pdf-engine")

  assert.equal(typeof contracts.createHealthResponse, "function")
  assert.equal(typeof configuration.loadFoundationConfiguration, "function")
  assert.equal(typeof database.createPrismaClient, "function")
  assert.equal(typeof observability.createLogEntry, "function")
  assert.equal(typeof pdfEngine.mergePdfBuffers, "function")
})

test("compatibility exports are the canonical package implementations", () => {
  assert.equal(compatibilityHasAnyPermission, hasAnyPermission)
  assert.equal(compatibilityRoleCodes, ROLE_CODES)
  assert.equal(compatibilityNextRevision, getNextRevisionLabel)
  assert.equal(compatibilityReplyState, resolveReplyState)
})

test("MDR route inventory remains exactly equal to the baseline", () => {
  const result = spawnSync(
    process.execPath,
    [join(repositoryRoot, "scripts/check-architecture.mjs")],
    { cwd: repositoryRoot, encoding: "utf8" }
  )

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Architecture validation passed/)
})

test("web foundations return health, readiness, and isolated app identity", () => {
  assert.equal(getApproveHealth().application, "approve-web")
  assert.equal(getApproveHealth().status, "healthy")
  assert.equal(getApproveReadiness().status, "ready")
  assert.equal(getVerifyHealth().application, "verify-web")
  assert.equal(getVerifyHealth().status, "healthy")
  assert.equal(getVerifyReadiness().status, "ready")
})

test("platform API exposes only operational foundation endpoints", async () => {
  const server = createPlatformApiServer()
  await new Promise<void>((resolvePromise) =>
    server.listen(0, "127.0.0.1", resolvePromise)
  )

  try {
    const address = server.address()
    assert.ok(address && typeof address !== "string")
    const baseUrl = `http://127.0.0.1:${address.port}`

    for (const path of ["/health", "/ready", "/version"]) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { "x-request-id": "phase-2-test" },
      })
      assert.equal(response.status, 200)
      assert.equal(response.headers.get("x-request-id"), "phase-2-test")
      assert.equal((await response.json()).application, "platform-api")
    }

    assert.equal((await fetch(`${baseUrl}/approval`)).status, 404)
    assert.equal(
      (await fetch(`${baseUrl}/health`, { method: "POST" })).status,
      405
    )
  } finally {
    await new Promise<void>((resolvePromise, reject) =>
      server.close((error) => (error ? reject(error) : resolvePromise()))
    )
  }
})

test("worker starts and stops with truthful empty job state", () => {
  const logs: string[] = []
  const runtime = createWorkerRuntime(
    { NODE_ENV: "test" },
    (line) => logs.push(line)
  )

  assert.deepEqual(runtime.start(), {
    started: true,
    ready: true,
    stopping: false,
  })
  assert.deepEqual(runtime.stop("test"), {
    started: true,
    ready: false,
    stopping: true,
  })
  assert.match(logs[0], /"jobsRegistered":0/)
  assert.match(logs[1], /"signal":"test"/)
})

test("architecture validator rejects workspace dependency cycles", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "dtg-architecture-"))

  try {
    for (const [name, dependency] of [
      ["alpha", "@dtg/beta"],
      ["beta", "@dtg/alpha"],
    ] as const) {
      const directory = join(fixtureRoot, "packages", name)
      await mkdir(join(directory, "src"), { recursive: true })
      await writeFile(
        join(directory, "package.json"),
        JSON.stringify({
          name: `@dtg/${name}`,
          dependencies: { [dependency]: "workspace:*" },
        })
      )
      await writeFile(join(directory, "src/index.ts"), "export const value = 1\n")
    }

    const result = spawnSync(
      process.execPath,
      [
        join(repositoryRoot, "scripts/check-architecture.mjs"),
        "--root",
        fixtureRoot,
        "--skip-routes",
      ],
      { encoding: "utf8" }
    )

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Workspace dependency cycle/)
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})

test("root orchestration exposes every Phase 2 command", async () => {
  const manifest = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8")
  )
  const requiredScripts = [
    "dev:mdr",
    "dev:approve",
    "dev:verify",
    "dev:api",
    "dev:worker",
    "lint",
    "typecheck",
    "test",
    "test:unit",
    "test:characterization",
    "test:integration",
    "test:ci",
    "build",
    "build:mdr",
    "build:approve",
    "build:verify",
    "build:api",
    "build:worker",
    "check:architecture",
    "docs:validate",
  ]

  assert.deepEqual(
    requiredScripts.filter((script) => !manifest.scripts[script]),
    []
  )
})
