import { access, readFile } from "node:fs/promises"

const requiredFiles = [
  "docs/FINAL_GATE_MATRIX.md",
  "docs/GRAPHIFY_FINAL.md",
  "docs/LEGACY_PARITY_AND_RETIREMENT.md",
  "docs/SECURITY_ACCEPTANCE.md",
  "docs/PERFORMANCE_ACCEPTANCE.md",
  "docs/reports/FINAL_MERGE_IMPLEMENTATION_REPORT.md",
]

for (const file of requiredFiles) await access(file)

const report = await readFile(
  "docs/reports/FINAL_MERGE_IMPLEMENTATION_REPORT.md",
  "utf8"
)
for (const heading of [
  "1. Executive Summary",
  "15. Signing/Seal/PAdES Status",
  "30. Security",
  "36. Test Inventory/Results",
  "40. Production Readiness",
  "44. Final SHA",
  "45. Clean Tree",
]) {
  if (!report.includes(heading))
    throw new Error(`Final report is missing heading: ${heading}`)
}

if (!report.includes("STAGING_READY"))
  throw new Error(
    "Final report must contain the evidence-based readiness verdict."
  )

console.log(
  `Phase 15 documentation validation passed for ${requiredFiles.length} files.`
)
