import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const files = [
  "docs/GOOGLE_DRIVE_INTEGRATION.md",
  "docs/CONTROLLED_DOCUMENTS_DRIVE.md",
  "docs/FILE_LIFECYCLE.md",
  "docs/CONTROLLED_STORAGE_PERMISSIONS.md",
  "docs/DRIVE_RECONCILIATION.md",
  "docs/LEGACY_STORAGE_MIGRATION.md",
  "docs/CONTROLLED_STORAGE_RUNBOOK.md",
  "docs/GRAPHIFY_PHASE_5.md",
  "docs/reports/PHASE_5_CONTROLLED_GOOGLE_DRIVE_REPORT.md",
]
for (const file of files) {
  const content = await readFile(resolve(root, file), "utf8")
  if (!content.trim()) throw new Error(`${file} is empty.`)
}
const report = await readFile(resolve(root, files.at(-1)), "utf8")
for (const heading of [
  "Picker",
  "Storage Adapter",
  "Controlled Copy",
  "Hashing",
  "One-Main-File",
  "Folder Routing",
  "Permissions",
  "Tamper Detection",
  "Uploads",
  "Legacy Compatibility",
  "Test Results",
  "Live Google Verification",
  "External Blockers",
  "Phase 6 Readiness",
  "Commit",
]) {
  if (!report.includes(heading)) throw new Error(`Missing heading: ${heading}`)
}
console.log(
  `Phase 5 documentation validation passed for ${files.length} files.`
)
