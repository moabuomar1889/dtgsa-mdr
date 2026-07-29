import { spawn } from "node:child_process"
import { Client } from "pg"
import { validateDatabaseSafety } from "./lib/database-safety.mjs"

const url = process.env.MIGRATION_DATABASE_URL
if (!url) throw new Error("MIGRATION_DATABASE_URL is required.")
if (process.env.NODE_ENV !== "production")
  validateDatabaseSafety(url, process.env)
if (process.env.PRE_MIGRATION_BACKUP_CONFIRMED !== "true") {
  throw new Error("A verified pre-migration backup must be confirmed.")
}
const lock = new Client({ connectionString: url })
await lock.connect()
try {
  const acquired = await lock.query(
    "SELECT pg_try_advisory_lock(hashtext('dtg-signature-platform-migrate')) AS acquired"
  )
  if (!acquired.rows[0]?.acquired) throw new Error("Migration lock is held.")
  const code = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        process.env.PRISMA_BIN ?? "node_modules/prisma/build/index.js",
        "migrate",
        "deploy",
      ],
      { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } }
    )
    child.once("error", reject)
    child.once("exit", resolve)
  })
  if (code !== 0)
    throw new Error(`Migration deployment failed with code ${code}.`)
} finally {
  await lock
    .query(
      "SELECT pg_advisory_unlock(hashtext('dtg-signature-platform-migrate'))"
    )
    .catch(() => undefined)
  await lock.end()
}
