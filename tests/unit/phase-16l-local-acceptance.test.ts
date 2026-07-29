import assert from "node:assert/strict"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Readable } from "node:stream"
import test from "node:test"
import {
  LocalEd25519SigningProvider,
  LocalEmailSink,
  LocalFilesystemDriveAdapter,
  LocalMalwareScanner,
  LocalWebhookVerifier,
  LocalWorkspaceDirectoryAdapter,
  assertLocalDatabaseUrl,
  assertLocalProviderConfiguration,
  assertLoopbackUrl,
  signLocalWebhook,
} from "@dtg/local-acceptance"

const localEnv = {
  LOCAL_ACCEPTANCE_MODE: "true",
  NODE_ENV: "development",
} as NodeJS.ProcessEnv

test("local guard rejects external destinations and production-like databases", () => {
  assert.throws(() => assertLoopbackUrl("https://accounts.google.com"))
  assert.throws(() => assertLoopbackUrl("https://hooks.example.com"))
  assert.throws(() =>
    assertLocalDatabaseUrl("postgresql://u:p@127.0.0.1/dtgsa_production")
  )
  assert.deepEqual(
    assertLocalDatabaseUrl(
      "postgresql://local:redacted@127.0.0.1:55432/dtgsa_local_demo"
    ),
    {
      host: "127.0.0.1",
      port: "55432",
      databaseName: "dtgsa_local_demo",
    }
  )
  assert.throws(() =>
    assertLocalProviderConfiguration({
      ...localEnv,
      DATABASE_URL: "postgresql://u:p@db.example.com/dtgsa_local_demo",
    })
  )
  assert.throws(() =>
    assertLocalProviderConfiguration({
      ...localEnv,
      EMAIL_PROVIDER: "smtp",
    })
  )
})

test("local providers are impossible to initialise outside explicit local mode", () => {
  assert.throws(() => new LocalWorkspaceDirectoryAdapter([], {}))
  assert.throws(() => new LocalMalwareScanner({ NODE_ENV: "production" }))
})

test("filesystem Drive persists IDs, ranges, copies, permissions, moves, and tamper", async () => {
  const runtimeRoot = await mkdtemp(join(tmpdir(), "dtg-local-"))
  try {
    const sourceRoot = join(runtimeRoot, "source-drive")
    const controlledRoot = join(runtimeRoot, "controlled-documents")
    const fixture = join(sourceRoot, "fixture.pdf")
    await mkdir(sourceRoot, { recursive: true })
    await writeFile(fixture, Buffer.from("%PDF-1.7\nsynthetic fixture"))
    const source = new LocalFilesystemDriveAdapter({
      root: sourceRoot,
      runtimeRoot,
      driveId: "local-source",
      env: localEnv,
    })
    const controlled = new LocalFilesystemDriveAdapter({
      root: controlledRoot,
      runtimeRoot,
      driveId: "local-controlled",
      env: localEnv,
    })
    const imported = await source.importFile({
      sourcePath: fixture,
      mimeType: "application/pdf",
      parentId: "source-root",
    })
    const selected = await source.getMetadata(imported.fileId)
    assert.equal(selected?.name, "fixture.pdf")
    const range = await source.read(imported.fileId, { start: 0, end: 3 })
    const chunks: Buffer[] = []
    for await (const chunk of range) chunks.push(Buffer.from(chunk))
    assert.equal(Buffer.concat(chunks).toString(), "%PDF")

    const staged = await controlled.uploadResumable({
      folderId: "controlled-root",
      opaqueName: "opaque.pdf",
      mimeType: "application/pdf",
      bytes: Readable.from(
        await (async () => {
          const stream = await source.read(imported.fileId)
          const values: Buffer[] = []
          for await (const chunk of stream) values.push(Buffer.from(chunk))
          return Buffer.concat(values)
        })()
      ),
    })
    await controlled.applyRestrictedPermissions(staged.fileId, [
      "dc.admin@local.test",
    ])
    await controlled.move(staged.fileId, "project-folder")
    await controlled.rename(staged.fileId, "renamed-opaque.pdf")
    assert.equal(
      (await controlled.getMetadata(staged.fileId))?.parents[0],
      "project-folder"
    )
    assert.equal((await controlled.listPermissions(staged.fileId)).length, 1)
    await controlled.tamper(staged.fileId, Buffer.from("tampered"))
    assert.equal(
      (await controlled.getMetadata(staged.fileId))?.fileId,
      staged.fileId
    )
  } finally {
    await rm(runtimeRoot, { recursive: true, force: true })
  }
})

test("identity, malware, email, webhook, and signing simulations fail closed", async () => {
  const runtimeRoot = await mkdtemp(join(tmpdir(), "dtg-local-"))
  try {
    const directory = new LocalWorkspaceDirectoryAdapter(undefined, localEnv)
    const firstPage = await directory.listUsers({ dryRun: true })
    assert.equal(firstPage.users.length, 5)
    assert.ok(firstPage.nextCursor)

    const scanner = new LocalMalwareScanner(localEnv)
    assert.equal(scanner.scan(Buffer.from("clean")).safe, true)
    assert.equal(scanner.scan(Buffer.from("clean"), "UNKNOWN").safe, false)

    const email = new LocalEmailSink({
      root: join(runtimeRoot, "email"),
      runtimeRoot,
      env: localEnv,
    })
    await email.deliver({
      to: "client.user@local.test",
      subject: "Synthetic invitation",
      text: "http://127.0.0.1:3100/portal/access",
      correlationId: "correlation-local",
    })
    await assert.rejects(() =>
      email.deliver({
        to: "real@example.com",
        subject: "Blocked",
        text: "blocked",
        correlationId: "correlation-blocked",
      })
    )

    const secret = "local-webhook-secret"
    const timestamp = new Date().toISOString()
    const body = JSON.stringify({ synthetic: true })
    const webhook = new LocalWebhookVerifier([secret], localEnv)
    const delivery = {
      eventId: "event-local-1",
      timestamp,
      body,
      signature: signLocalWebhook(secret, timestamp, body),
    }
    assert.equal(webhook.verify(delivery).accepted, true)
    assert.throws(() => webhook.verify(delivery), /replay/i)

    const signing = new LocalEd25519SigningProvider({
      root: join(runtimeRoot, "signing"),
      runtimeRoot,
      env: localEnv,
    })
    await signing.initialise()
    const payload = Buffer.from("synthetic package manifest")
    const sealed = await signing.sign(payload)
    assert.equal(await signing.verify(payload, sealed), true)
    assert.equal(await signing.verify(Buffer.from("modified"), sealed), false)
    await signing.revoke(sealed.keyId)
    assert.equal(await signing.verify(payload, sealed), false)
  } finally {
    await rm(runtimeRoot, { recursive: true, force: true })
  }
})
