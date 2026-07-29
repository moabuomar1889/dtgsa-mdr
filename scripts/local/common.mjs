import { randomBytes } from "node:crypto"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import EmbeddedPostgres from "embedded-postgres"

export const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
)
export const runtimeRoot = resolve(
  process.env.LOCAL_RUNTIME_ROOT || join(repositoryRoot, ".local-runtime")
)
export const configPath = join(runtimeRoot, "config.json")
export const statePath = join(runtimeRoot, "state.json")
export const host = "127.0.0.1"
export const pnpmEntry = process.env.npm_execpath

export function pnpmInvocation(args) {
  if (!pnpmEntry) {
    throw new Error(
      "Run local lifecycle commands through pnpm so npm_execpath is available."
    )
  }
  return { command: process.execPath, args: [pnpmEntry, ...args] }
}

export function assertWithinRuntime(target) {
  const resolved = resolve(target)
  if (
    resolved !== runtimeRoot &&
    !resolved.startsWith(
      `${runtimeRoot}${process.platform === "win32" ? "\\" : "/"}`
    )
  ) {
    throw new Error("Refusing a path outside .local-runtime.")
  }
  return resolved
}

export async function ensureConfig() {
  await mkdir(runtimeRoot, { recursive: true })
  if (existsSync(configPath)) {
    return JSON.parse(await readFile(configPath, "utf8"))
  }
  const config = {
    version: 1,
    database: {
      host,
      port: Number(process.env.LOCAL_DATABASE_PORT || 55432),
      name: "dtgsa_local_demo",
      user: "dtgsa_local_user",
      password: randomBytes(24).toString("base64url"),
    },
    ports: {
      mdr: Number(process.env.LOCAL_MDR_PORT || 3100),
      approve: Number(process.env.LOCAL_APPROVE_PORT || 3101),
      verify: Number(process.env.LOCAL_VERIFY_PORT || 3102),
      api: Number(process.env.LOCAL_API_PORT || 4100),
      email: Number(process.env.LOCAL_EMAIL_PORT || 4101),
      control: Number(process.env.LOCAL_CONTROL_PORT || 4199),
    },
    secrets: {
      appEncryption: randomBytes(32).toString("base64url"),
      cron: randomBytes(24).toString("base64url"),
      magicLink: randomBytes(32).toString("base64url"),
      webhookEncryption: randomBytes(32).toString("base64url"),
      webhookSigning: randomBytes(32).toString("base64url"),
    },
    createdAt: new Date().toISOString(),
  }
  await writeFile(configPath, JSON.stringify(config, null, 2), {
    mode: 0o600,
  })
  return config
}

export function databaseUrl(config, databaseName = config.database.name) {
  return `postgresql://${encodeURIComponent(config.database.user)}:${encodeURIComponent(config.database.password)}@${host}:${config.database.port}/${databaseName}`
}

export function localEnvironment(config, extra = {}) {
  const url = databaseUrl(config)
  return {
    ...process.env,
    NODE_ENV: "development",
    APP_ENVIRONMENT: "local-acceptance",
    LOCAL_ACCEPTANCE_MODE: "true",
    LOCAL_RUNTIME_ROOT: runtimeRoot,
    DATABASE_URL: url,
    DIRECT_URL: url,
    NEXT_PUBLIC_APP_URL: `http://${host}:${config.ports.mdr}`,
    NEXT_PUBLIC_SUPABASE_URL: `http://${host}:54321`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-local-key",
    APP_ENCRYPTION_KEY: config.secrets.appEncryption,
    CRON_SECRET: config.secrets.cron,
    MAGIC_LINK_SECRET: config.secrets.magicLink,
    WEBHOOK_ENCRYPTION_KEY: config.secrets.webhookEncryption,
    LOCAL_WEBHOOK_SECRET: config.secrets.webhookSigning,
    AUTH_MODE: "DUAL_TRANSITION",
    GOOGLE_WORKSPACE_ALLOWED_DOMAINS: "local.test",
    GOOGLE_DIRECTORY_SYNC_ENABLED: "false",
    GOOGLE_DRIVE_SHARED_DRIVE_ID: "local-source-drive",
    GOOGLE_DRIVE_ROOT_FOLDER_ID: "local-controlled-root",
    GOOGLE_DRIVE_PROJECTS_FOLDER_ID: "local-projects-root",
    GOOGLE_DRIVE_CLIENT_EMAIL: "local-provider@local.test",
    GOOGLE_ADMIN_EMAIL: "dc.admin@local.test",
    FILE_UPLOAD_MAX_MB: "600",
    TRANSMITTAL_MAX_TOTAL_MB: "600",
    EMAIL_PROVIDER: "local",
    EMAIL_FROM: "dtg-platform@local.test",
    STORAGE_PROVIDER: "local",
    SIGNING_PROVIDER: "local",
    MDR_INTERNAL_ORIGIN: `http://${host}:${config.ports.mdr}`,
    NEXT_PUBLIC_MDR_ORIGIN: `http://${host}:${config.ports.mdr}`,
    APPROVE_PUBLIC_ORIGIN: `http://${host}:${config.ports.approve}`,
    HOST: host,
    ...extra,
  }
}

export function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: options.env || process.env,
      stdio: options.stdio || "inherit",
      windowsHide: true,
      detached: options.detached || false,
    })
    child.once("error", reject)
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise({ code, signal })
      else {
        reject(
          new Error(
            `${command} exited with ${code ?? `signal ${signal || "unknown"}`}.`
          )
        )
      }
    })
    if (options.unref) child.unref()
  })
}

export async function portAvailable(port) {
  return new Promise((resolvePromise) => {
    const server = createServer()
    server.once("error", () => resolvePromise(false))
    server.listen(port, host, () => {
      server.close(() => resolvePromise(true))
    })
  })
}

export async function startDatabase(config) {
  const databaseDir = assertWithinRuntime(join(runtimeRoot, "postgres"))
  const postgres = new EmbeddedPostgres({
    databaseDir,
    user: config.database.user,
    password: config.database.password,
    port: config.database.port,
    persistent: true,
    postgresFlags: ["-h", host],
    onLog: () => undefined,
    onError: () => undefined,
  })
  await mkdir(databaseDir, { recursive: true })
  if (!existsSync(join(databaseDir, "PG_VERSION"))) {
    await postgres.initialise()
  }
  await postgres.start()
  const admin = postgres.getPgClient("postgres", host)
  await admin.connect()
  const found = await admin.query(
    "select 1 from pg_database where datname = $1",
    [config.database.name]
  )
  if (found.rowCount === 0) await postgres.createDatabase(config.database.name)
  await admin.end()
  return postgres
}

export async function writeSafeState(state) {
  await writeFile(statePath, JSON.stringify(state, null, 2))
}

export function safeSummary(config) {
  return {
    database: {
      host,
      port: config.database.port,
      name: config.database.name,
      password: "[REDACTED]",
    },
    urls: {
      mdr: `http://${host}:${config.ports.mdr}`,
      approve: `http://${host}:${config.ports.approve}`,
      verify: `http://${host}:${config.ports.verify}`,
      api: `http://${host}:${config.ports.api}`,
      email: `http://${host}:${config.ports.email}`,
      acceptance: `http://${host}:${config.ports.mdr}/local-acceptance`,
    },
  }
}
