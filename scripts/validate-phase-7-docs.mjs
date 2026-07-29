import { access, readFile } from "node:fs/promises"

const files = [
  "docs/WORKFLOW_SPECIFICATION.md",
  "docs/INTERNAL_APPROVAL_LIFECYCLE.md",
  "docs/SEPARATION_OF_DUTIES.md",
  "docs/WORKFLOW_MIGRATION.md",
  "docs/DECISION_IDEMPOTENCY.md",
  "docs/GRAPHIFY_PHASE_7.md",
  "docs/reports/PHASE_7_WORKFLOW_ENGINE_REPORT.md",
]
for (const file of files) await access(file)
const report = await readFile(files.at(-1), "utf8")
for (const phrase of [
  "MDR-DEFECT-004",
  "Prepared By Manager",
  "DC Validator",
  "Phase 8 Readiness",
]) {
  if (!report.includes(phrase))
    throw new Error(`Phase 7 report missing: ${phrase}`)
}
console.log(
  `Phase 7 documentation validation passed for ${files.length} files.`
)
