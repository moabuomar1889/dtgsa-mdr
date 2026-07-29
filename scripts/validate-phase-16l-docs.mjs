import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const requiredFiles = [
  "docs/LOCAL_MANUAL_ACCEPTANCE_GUIDE.md",
  "docs/LOCAL_USER_GUIDE.md",
  "docs/PHASE_16L_STATUS_ADDENDUM.md",
  "docs/reports/PHASE_16L_FULL_LOCAL_ACCEPTANCE_REPORT.md",
]
const errors = []

for (const file of requiredFiles) {
  const content = await readFile(resolve(root, file), "utf8").catch(() => null)
  if (!content) errors.push(`Missing or empty ${file}.`)
}

const report = await readFile(
  resolve(root, "docs/reports/PHASE_16L_FULL_LOCAL_ACCEPTANCE_REPORT.md"),
  "utf8"
)
for (let section = 1; section <= 53; section += 1) {
  if (!report.includes(`## ${section}.`)) {
    errors.push(`Phase 16L report is missing section ${section}.`)
  }
}
for (const value of [
  "FULL_LOCAL_ACCEPTANCE_COMPLETE",
  "EXTERNAL_INTEGRATIONS_UNVERIFIED",
  "SERVER_DEPLOYMENT_NOT_STARTED",
  "LOCAL DEVELOPMENT APPLICATION SEAL",
]) {
  if (!report.includes(value)) errors.push(`Report is missing ${value}.`)
}

for (const file of [
  "README.md",
  "docs/CURRENT_STATE.md",
  "docs/ROADMAP.md",
  "docs/HANDOFF.md",
  "docs/FINAL_GATE_MATRIX.md",
]) {
  const content = await readFile(resolve(root, file), "utf8")
  if (content.includes("STAGING_READY")) {
    errors.push(`Current-status document ${file} still uses STAGING_READY.`)
  }
}

if (errors.length) {
  console.error(`Phase 16L documentation validation failed (${errors.length}).`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    "Phase 16L documentation validation passed: four required documents, 53 report sections, and current status vocabulary."
  )
}
