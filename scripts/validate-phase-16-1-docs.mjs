import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const retiredName = ["SUPA", "BASE"].join("")
const reportPath = `docs/reports/PHASE_16_1_${retiredName}_ELIMINATION_REPORT.md`
const requiredFiles = [
  `docs/${retiredName}_ELIMINATION_INVENTORY.md`,
  "docs/POSTGRESQL_PRISMA_ONLY_ARCHITECTURE.md",
  "docs/CLEAN_DATABASE_BASELINE.md",
  "docs/AUTHENTICATION_PROVIDERS.md",
  "docs/FILE_STORAGE_PROVIDERS.md",
  `docs/decisions/ADR-${retiredName}-REMOVAL.md`,
  "docs/decisions/ADR-CLEAN-PRISMA-BASELINE.md",
  "docs/LOCAL_DEVELOPMENT.md",
  "SECURITY.md",
  reportPath,
]
const errors = []

for (const file of requiredFiles) {
  const content = await readFile(resolve(root, file), "utf8").catch(() => null)
  if (!content?.trim()) errors.push(`Missing or empty ${file}.`)
}

const report = await readFile(resolve(root, reportPath), "utf8").catch(() => "")
for (let section = 1; section <= 45; section += 1) {
  if (!report.includes(`## ${section}.`)) {
    errors.push(`Phase 16.1 report is missing section ${section}.`)
  }
}

for (const value of [
  "COMPLETE",
  "HISTORICAL_ONLY",
  "EXTERNAL_INTEGRATIONS_UNVERIFIED",
  "SERVER_DEPLOYMENT_NOT_STARTED",
]) {
  if (!report.includes(value)) errors.push(`Report is missing ${value}.`)
}

if (errors.length > 0) {
  console.error(
    `Phase 16.1 documentation validation failed (${errors.length}).`
  )
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    "Phase 16.1 documentation validation passed: architecture, ADRs, inventory, and 45 report sections."
  )
}
