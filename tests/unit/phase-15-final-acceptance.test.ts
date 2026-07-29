import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("all phase reports are present in the final gate matrix", async () => {
  const matrix = await readFile("docs/FINAL_GATE_MATRIX.md", "utf8")
  for (const phase of [
    "Phase 0",
    "Phase 1",
    "Phase 1.5",
    "Phase 2",
    "Phase 3",
    "Phase 4",
    "Phase 5",
    "Phase 6",
    "Phase 7",
    "Phase 8",
    "Phase 9",
    "Phase 10",
    "Phase 11",
    "Phase 12",
    "Phase 13",
    "Phase 14",
    "Phase 15",
  ]) {
    assert.match(
      matrix,
      new RegExp(`\\|\\s*${phase.replace(".", "\\.")}\\s*\\|`)
    )
  }
})

test("legacy retirement requires parity, reconciliation, and no consumers", async () => {
  const policy = await readFile("docs/LEGACY_PARITY_AND_RETIREMENT.md", "utf8")
  for (const phrase of [
    "Target path enabled",
    "Data migration and reconciliation complete",
    "Rollback no longer required",
    "No remaining consumers",
    "RETAINED_DEPRECATED",
  ]) {
    assert.match(policy, new RegExp(phrase))
  }
})

test("all public web applications define baseline security headers", async () => {
  for (const file of [
    "apps/mdr-web/next.config.ts",
    "apps/approve-web/next.config.ts",
    "apps/verify-web/next.config.ts",
  ]) {
    const source = await readFile(file, "utf8")
    assert.match(source, /Content-Security-Policy/)
    assert.match(source, /frame-ancestors 'none'/)
    assert.match(source, /X-Content-Type-Options/)
    assert.match(source, /X-Frame-Options/)
    assert.match(source, /Permissions-Policy/)
  }
})

test("the integration API emits non-cacheable defensive headers", async () => {
  const source = await readFile("apps/platform-api/src/server.ts", "utf8")
  assert.match(source, /"cache-control": "no-store"/)
  assert.match(source, /"content-security-policy": "default-src 'none'/)
  assert.match(source, /"x-content-type-options": "nosniff"/)
})

test("vulnerable spreadsheet dependency was replaced without changing XLSX contract", async () => {
  const manifest = JSON.parse(
    await readFile("apps/mdr-web/package.json", "utf8")
  ) as { dependencies: Record<string, string> }
  assert.equal(manifest.dependencies.xlsx, undefined)
  assert.equal(manifest.dependencies["@e965/xlsx"], "0.20.3")
  const source = await readFile("apps/mdr-web/src/lib/pdi/excel.ts", "utf8")
  assert.match(source, /@e965\/xlsx/)
  assert.match(source, /PDI_EXPORT_COLUMNS/)
})

test("runtime security dependencies use patched minimum versions", async () => {
  const mdr = JSON.parse(
    await readFile("apps/mdr-web/package.json", "utf8")
  ) as { dependencies: Record<string, string> }
  assert.equal(mdr.dependencies.next, "16.2.12")
  assert.equal(mdr.dependencies.nodemailer, "^9.0.3")
  assert.equal(mdr.dependencies.docxtemplater, "^3.69.3")
  assert.equal(mdr.dependencies.sharp, "^0.35.3")
})

test("the approved standards commit is recorded exactly", async () => {
  assert.equal(
    (await readFile("STANDARD_VERSION", "utf8")).trim(),
    "dtg-development-standards@e02dc9eb6db3f3c6e66e16b4bd8a50c731ce044f"
  )
})

test("final report is candid about external and deferred acceptance", async () => {
  const report = await readFile(
    "docs/reports/FINAL_MERGE_IMPLEMENTATION_REPORT.md",
    "utf8"
  )
  assert.match(report, /STAGING_READY/)
  assert.match(report, /PAdES.*DEFERRED/s)
  assert.match(report, /Google.*BLOCKED/s)
  assert.match(report, /Coolify.*BLOCKED/s)
  assert.match(report, /Docker.*BLOCKED/s)
})
