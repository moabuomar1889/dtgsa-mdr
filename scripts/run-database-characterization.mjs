import { randomBytes } from "node:crypto"
import { spawn } from "node:child_process"
import { mkdir, readFile, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import EmbeddedPostgres from "embedded-postgres"
import {
  assertSafeTestDatabaseUrl,
  redactTestDatabaseUrl,
} from "../tests/helpers/database-safety.mjs"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const databaseRoot = join(repositoryRoot, ".test-postgres")
const databaseName = "dtgsa_mdr_characterization_test"
const databaseUser = "dtgsa_test_user"

function run(command, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env,
      stdio: "inherit",
      windowsHide: true,
    })

    child.on("error", reject)
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise()
        return
      }

      reject(
        new Error(
          `${command} exited with ${code ?? `signal ${signal ?? "unknown"}`}.`
        )
      )
    })
  })
}

async function findAvailablePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer()
    server.unref()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        reject(new Error("Could not allocate a local PostgreSQL test port."))
        return
      }

      server.close(() => resolvePromise(address.port))
    })
  })
}

async function readPackageBin(packageName) {
  const packagePath = join(
    repositoryRoot,
    "node_modules",
    packageName,
    "package.json"
  )
  const manifest = JSON.parse(await readFile(packagePath, "utf8"))
  const relativeBin =
    typeof manifest.bin === "string"
      ? manifest.bin
      : manifest.bin[packageName === "prisma" ? "prisma" : packageName]

  return join(dirname(packagePath), relativeBin)
}

async function applyMigrationSql(client, migrationName) {
  const migrationPath = join(
    repositoryRoot,
    "prisma",
    "migrations",
    migrationName,
    "migration.sql"
  )
  const migrationSql = await readFile(migrationPath, "utf8")
  await client.query(migrationSql)
  console.log(`Applied upgrade migration ${migrationName}.`)
}

async function runSeed(environment, includePhase3Fixtures = false) {
  const tsxBin = await readPackageBin("tsx")
  await run(
    process.execPath,
    [tsxBin, "scripts/seed-foundation.ts"],
    includePhase3Fixtures
      ? { ...environment, SEED_PHASE3_FOUNDATION: "true" }
      : environment
  )
}

async function cleanDatabaseRoot() {
  const resolvedRoot = resolve(databaseRoot)
  const expectedParent = resolve(repositoryRoot)

  if (
    resolvedRoot === expectedParent ||
    !resolvedRoot.startsWith(`${expectedParent}\\`)
  ) {
    throw new Error("Refusing to clean a database path outside the repository.")
  }

  await rm(resolvedRoot, { recursive: true, force: true })
  console.log("Disposable PostgreSQL data directory removed.")
}

async function runWithDatabase(mode) {
  const port = await findAvailablePort()
  const password = randomBytes(24).toString("hex")
  const runDirectory = join(databaseRoot, `run-${Date.now()}-${process.pid}`)
  const testDatabaseUrl = `postgresql://${databaseUser}:${password}@127.0.0.1:${port}/${databaseName}`
  const approved = assertSafeTestDatabaseUrl(testDatabaseUrl)
  const postgres = new EmbeddedPostgres({
    databaseDir: runDirectory,
    user: databaseUser,
    password,
    port,
    persistent: false,
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => undefined,
    onError: (error) => {
      if (error) {
        console.error("Disposable PostgreSQL reported an error.")
      }
    },
  })

  const testEnvironment = {
    ...process.env,
    NODE_ENV: "test",
    TEST_DATABASE_URL: testDatabaseUrl,
    DATABASE_URL: testDatabaseUrl,
    DIRECT_URL: testDatabaseUrl,
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-test-key",
    APP_ENCRYPTION_KEY: "test-encryption-key-32-characters!",
    CRON_SECRET: "test-cron-secret-1234",
    GOOGLE_WORKSPACE_ALLOWED_DOMAINS: "dtg.example",
    GOOGLE_DRIVE_SHARED_DRIVE_ID: "drive-1",
    GOOGLE_DRIVE_ROOT_FOLDER_ID: "controlled-root",
    GOOGLE_DRIVE_CLIENT_EMAIL: "service@dtg.example",
    EMAIL_PROVIDER: "",
  }

  await mkdir(databaseRoot, { recursive: true })
  console.log(
    `Starting disposable PostgreSQL ${redactTestDatabaseUrl(testDatabaseUrl)}`
  )
  console.log(
    `Safety gate approved host=${approved.host} database=${approved.databaseName}`
  )

  try {
    await postgres.initialise()
    await postgres.start()
    await postgres.createDatabase(databaseName)

    const adminClient = postgres.getPgClient(databaseName, "127.0.0.1")
    await adminClient.connect()
    const versionResult = await adminClient.query(
      "select current_setting('server_version') as version"
    )
    console.log(`PostgreSQL version ${versionResult.rows[0].version} is ready.`)

    if (mode === "database-check") {
      await adminClient.end()
      return
    }

    if (mode === "upgrade-check") {
      await applyMigrationSql(adminClient, "20260329143000_init_foundation")
      await runSeed(testEnvironment)
      await applyMigrationSql(
        adminClient,
        "20260729111500_phase3_database_foundation"
      )
      await runSeed(testEnvironment, true)
      await applyMigrationSql(
        adminClient,
        "20260729133000_phase4_identity_and_access"
      )
      await applyMigrationSql(
        adminClient,
        "20260729153000_phase5_controlled_google_drive"
      )
      await applyMigrationSql(
        adminClient,
        "20260729170000_phase6_manifest_and_evidence"
      )
      await applyMigrationSql(
        adminClient,
        "20260729190000_phase7_workflow_engine"
      )
      await applyMigrationSql(
        adminClient,
        "20260729210000_phase8_cover_designer"
      )
      await applyMigrationSql(
        adminClient,
        "20260729230000_phase9_approval_application"
      )
      await applyMigrationSql(
        adminClient,
        "20260730010000_phase10_durable_worker"
      )
      await applyMigrationSql(
        adminClient,
        "20260730030000_phase11_client_responses"
      )
      await applyMigrationSql(
        adminClient,
        "20260730050000_phase12_verification_portal"
      )
      await applyMigrationSql(
        adminClient,
        "20260730070000_phase13_integrations_requests"
      )
      await adminClient.end()
      return
    }

    await adminClient.end()
    const prismaBin = await readPackageBin("prisma")
    await run(
      process.execPath,
      [prismaBin, "migrate", "deploy"],
      testEnvironment
    )

    if (mode === "migration-check") {
      return
    }

    if (mode === "seed-check") {
      await runSeed(testEnvironment, true)
      return
    }

    if (mode === "all") {
      await runSeed(testEnvironment, true)
    }

    const tsxBin = await readPackageBin("tsx")
    const testFiles =
      mode === "integration"
        ? [
            "tests/integration/database-backed-characterization.test.ts",
            "tests/integration/phase-13-integrations.test.ts",
          ]
        : [
            "tests/unit/database-safety.test.ts",
            "tests/unit/phase-3-database-foundation.test.ts",
            "tests/unit/phase-4-identity-and-access.test.ts",
            "tests/unit/phase-5-controlled-storage.test.ts",
            "tests/unit/phase-6-manifest-and-evidence.test.ts",
            "tests/unit/phase-7-workflow-engine.test.ts",
            "tests/unit/phase-8-cover-designer.test.ts",
            "tests/unit/phase-9-approval-application.test.ts",
            "tests/unit/phase-10-downloads-and-worker.test.ts",
            "tests/unit/phase-11-client-responses.test.ts",
            "tests/unit/phase-12-verification-portal.test.ts",
            "tests/unit/phase-13-integrations.test.ts",
            "tests/unit/phase-14-operations.test.ts",
            "tests/unit/phase-15-final-acceptance.test.ts",
            "tests/unit/phase-16l-local-acceptance.test.ts",
            "tests/architecture/phase-2-foundation.test.ts",
            "tests/characterization/index.test.ts",
            "tests/integration/database-backed-characterization.test.ts",
            "tests/integration/phase-13-integrations.test.ts",
          ]

    await run(
      process.execPath,
      [
        tsxBin,
        "--conditions=react-server",
        "--test",
        "--test-concurrency=1",
        ...testFiles,
      ],
      testEnvironment
    )
  } finally {
    await postgres.stop().catch(() => undefined)
    await rm(runDirectory, { recursive: true, force: true })
    console.log("Disposable PostgreSQL stopped and test data removed.")
  }
}

const mode = process.argv[2] ?? "integration"

if (mode === "clean") {
  await cleanDatabaseRoot()
} else if (
  [
    "all",
    "integration",
    "database-check",
    "migration-check",
    "seed-check",
    "upgrade-check",
  ].includes(mode)
) {
  await runWithDatabase(mode)
} else {
  throw new Error(`Unsupported database characterization mode: ${mode}`)
}
