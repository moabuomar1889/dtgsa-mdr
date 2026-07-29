import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("five deployment units are isolated and database is private", async () => {
  const manifest = await readFile("deploy/coolify/services.yaml", "utf8")
  for (const service of [
    "mdr-web",
    "approve-web",
    "verify-web",
    "platform-api",
    "worker",
  ])
    assert.match(manifest, new RegExp(`name: ${service}`))
  assert.match(manifest, /public_port: false/)
  assert.equal((manifest.match(/mode: shared-postgresql/g) ?? []).length, 1)
})

test("containers are multi-stage, non-root, healthy, and secret-free", async () => {
  for (const file of [
    "deploy/docker/Dockerfile.web",
    "deploy/docker/Dockerfile.service",
  ]) {
    const source = await readFile(file, "utf8")
    assert.ok((source.match(/^FROM /gm) ?? []).length >= 2)
    assert.match(source, /USER dtg/)
    assert.match(source, /HEALTHCHECK/)
    assert.doesNotMatch(source, /DATABASE_URL=|SECRET=|PASSWORD=/)
  }
})

test("production migrations require backup and hold an advisory lock", async () => {
  const source = await readFile("scripts/deploy-migrate.mjs", "utf8")
  assert.match(source, /PRE_MIGRATION_BACKUP_CONFIRMED/)
  assert.match(source, /pg_try_advisory_lock/)
  assert.match(source, /"migrate",\s+"deploy"/s)
  assert.doesNotMatch(source, /migrate.*dev|reset/)
})

test("backup is encrypted and restore verifies integrity", async () => {
  const backup = await readFile("scripts/backup-postgres.sh", "utf8")
  const restore = await readFile("scripts/restore-postgres.sh", "utf8")
  assert.match(backup, /pg_dump/)
  assert.match(backup, /age --recipient/)
  assert.match(backup, /sha256sum/)
  assert.match(restore, /sha256sum -c/)
  assert.match(restore, /ALLOW_PRODUCTION_RESTORE/)
})
