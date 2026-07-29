import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"
import { spawn } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import pg from "pg"
import {
  databaseUrl,
  ensureConfig,
  localEnvironment,
  pnpmInvocation,
  repositoryRoot,
  runtimeRoot,
} from "./common.mjs"

const config = await ensureConfig()
const restoreDatabase = "dtgsa_local_restore"
const primaryUrl = databaseUrl(config)
const restoreUrl = databaseUrl(config, restoreDatabase)
const backupRoot = join(runtimeRoot, "backups")
await mkdir(backupRoot, { recursive: true })

function assertGuardedUrl(value) {
  const url = new URL(value)
  if (
    !["127.0.0.1", "localhost", "::1"].includes(url.hostname) ||
    !/(local|test|demo|restore)/.test(url.pathname.toLowerCase()) ||
    /(prod|staging|live)/.test(url.pathname.toLowerCase())
  ) {
    throw new Error("Backup/restore refused a non-local database target.")
  }
}
assertGuardedUrl(primaryUrl)
assertGuardedUrl(restoreUrl)

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`
}

function run(command, args, environment) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: environment,
      stdio: "inherit",
      windowsHide: true,
    })
    child.once("error", reject)
    child.once("exit", (code) =>
      code === 0
        ? resolvePromise()
        : reject(new Error(`${command} exited with ${code}.`))
    )
  })
}

function replacer(_key, value) {
  if (value && value.type === "Buffer" && Array.isArray(value.data)) {
    return { $binary: Buffer.from(value.data).toString("base64") }
  }
  return value
}

function reviver(_key, value) {
  if (value && typeof value === "object" && typeof value.$binary === "string") {
    return Buffer.from(value.$binary, "base64")
  }
  return value
}

const started = performance.now()
const primary = new pg.Client({ connectionString: primaryUrl })
await primary.connect()
await primary.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
const tableResult = await primary.query(
  "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' and table_name <> '_prisma_migrations' order by table_name"
)
const tables = {}
for (const { table_name: tableName } of tableResult.rows) {
  const result = await primary.query(
    `select * from ${quoteIdentifier(tableName)}`
  )
  tables[tableName] = result.rows
}
await primary.query("COMMIT")
await primary.end()

const catalog = {
  format: "DTG_LOCAL_LOGICAL_POSTGRESQL_BACKUP_V1",
  sourceDatabase: config.database.name,
  createdAt: new Date().toISOString(),
  isolation: "REPEATABLE READ READ ONLY",
  tables,
}
const plaintext = Buffer.from(JSON.stringify(catalog, replacer))
const key = createHash("sha256").update(config.secrets.appEncryption).digest()
const iv = randomBytes(12)
const cipher = createCipheriv("aes-256-gcm", key, iv)
const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
const envelope = {
  format: "DTG_LOCAL_ENCRYPTED_BACKUP_V1",
  algorithm: "AES-256-GCM",
  iv: iv.toString("base64url"),
  authTag: cipher.getAuthTag().toString("base64url"),
  ciphertext: ciphertext.toString("base64"),
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const backupPath = join(backupRoot, `dtgsa-local-${stamp}.backup.json`)
const backupBytes = Buffer.from(JSON.stringify(envelope))
await writeFile(backupPath, backupBytes, { mode: 0o600 })
const backupHash = createHash("sha256").update(backupBytes).digest("hex")
await writeFile(`${backupPath}.sha256`, `${backupHash}  ${backupPath}\n`)

const storedEnvelope = JSON.parse(await readFile(backupPath, "utf8"))
const decipher = createDecipheriv(
  "aes-256-gcm",
  key,
  Buffer.from(storedEnvelope.iv, "base64url")
)
decipher.setAuthTag(Buffer.from(storedEnvelope.authTag, "base64url"))
const restoredCatalog = JSON.parse(
  Buffer.concat([
    decipher.update(Buffer.from(storedEnvelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8"),
  reviver
)

const admin = new pg.Client({ connectionString: primaryUrl })
await admin.connect()
await admin.query(
  `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
  [restoreDatabase]
)
await admin.query(`drop database if exists ${quoteIdentifier(restoreDatabase)}`)
await admin.query(`create database ${quoteIdentifier(restoreDatabase)}`)
await admin.end()

const migration = pnpmInvocation(["exec", "prisma", "migrate", "deploy"])
await run(
  migration.command,
  migration.args,
  localEnvironment(config, {
    DATABASE_URL: restoreUrl,
    DIRECT_DATABASE_URL: restoreUrl,
  })
)

const restore = new pg.Client({ connectionString: restoreUrl })
await restore.connect()
await restore.query("BEGIN")
await restore.query("SET LOCAL session_replication_role = replica")
for (const [tableName, rows] of Object.entries(restoredCatalog.tables)) {
  if (!rows.length) continue
  for (const row of rows) {
    const columns = Object.keys(row)
    const values = Object.values(row)
    const placeholders = values.map((_, index) => `$${index + 1}`).join(",")
    await restore.query(
      `insert into ${quoteIdentifier(tableName)} (${columns
        .map(quoteIdentifier)
        .join(",")}) values (${placeholders})`,
      values
    )
  }
}
await restore.query("COMMIT")

const verificationTables = [
  "User",
  "Role",
  "Client",
  "Project",
  "PdiItem",
  "MdrDocument",
  "DocumentRevision",
  "AuditLog",
  "BackgroundJob",
  "ClientResponseCode",
  "GeneralRequestType",
]
const verification = []
for (const tableName of verificationTables) {
  const sourceCount = tables[tableName]?.length ?? 0
  const restored = await restore.query(
    `select count(*)::int as count from ${quoteIdentifier(tableName)}`
  )
  verification.push({
    table: tableName,
    sourceCount,
    restoredCount: restored.rows[0].count,
    matches: sourceCount === restored.rows[0].count,
  })
}
await restore.end()

const cleanup = new pg.Client({ connectionString: primaryUrl })
await cleanup.connect()
await cleanup.query(
  `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
  [restoreDatabase]
)
await cleanup.query(`drop database ${quoteIdentifier(restoreDatabase)}`)
await cleanup.end()

const result = {
  classification: verification.every((item) => item.matches)
    ? "VERIFIED_LOCAL"
    : "FAILED",
  backupPath,
  backupSha256: backupHash,
  encrypted: true,
  algorithm: "AES-256-GCM",
  sourceIsolation: "REPEATABLE READ READ ONLY",
  tableCount: Object.keys(tables).length,
  rowCount: Object.values(tables).reduce(
    (total, rows) => total + rows.length,
    0
  ),
  verification,
  restoredDatabaseRemoved: true,
  rpoSeconds: 0,
  rtoMs: Math.round(performance.now() - started),
}
await writeFile(
  join(backupRoot, "latest-result.json"),
  JSON.stringify(result, null, 2)
)
console.log(JSON.stringify(result, null, 2))
if (result.classification !== "VERIFIED_LOCAL") process.exitCode = 1
