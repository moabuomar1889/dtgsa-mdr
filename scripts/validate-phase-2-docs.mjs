import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const requiredFiles = [
  "docs/MONOREPO_ARCHITECTURE.md",
  "docs/PACKAGE_OWNERSHIP.md",
  "docs/DEPLOYMENT_UNITS.md",
  "docs/IMPORT_BOUNDARY_RULES.md",
  "docs/COMPATIBILITY_LAYER.md",
  "docs/ENVIRONMENT_VARIABLES.md",
  "docs/GRAPHIFY_PHASE_2.md",
  "docs/decisions/ADR-002-pnpm-modular-monorepo.md",
  "docs/decisions/ADR-003-compatibility-exports.md",
  "docs/decisions/ADR-004-independent-deployment-boundaries.md",
  "docs/decisions/ADR-005-defer-heavy-build-orchestrator.md",
  "docs/decisions/ADR-006-package-ownership-direction.md",
  "docs/reports/PHASE_2_MONOREPO_FOUNDATION_REPORT.md",
]

const reportSections = [
  "Executive Summary",
  "Owner Authorization",
  "Branch and Starting Commit",
  "Final Commit",
  "Baseline Validation",
  "Monorepo Decision",
  "Final Repository Tree",
  "Files Moved",
  "Files Created",
  "Files Updated",
  "Files Removed",
  "pnpm Workspace Configuration",
  "Root Script Inventory",
  "MDR Application Migration",
  "MDR Route Parity",
  "approve-web Foundation",
  "verify-web Foundation",
  "platform-api Foundation",
  "worker Foundation",
  "Shared Package Inventory",
  "Package Ownership",
  "Extracted Pure Policies",
  "Compatibility Re-exports",
  "Database and Prisma Location",
  "Architecture Boundary Rules",
  "Workspace Dependency Graph",
  "Graphify Baseline Comparison",
  "Import Cycles",
  "Existing Behavior Preservation",
  "Characterization Test Results",
  "Integration Test Results",
  "New Structural Test Results",
  "Exact Test Counts",
  "Application Build Results",
  "Typecheck Results",
  "ESLint Results",
  "Prisma Validation",
  "Migration Validation",
  "Documentation Validation",
  "Known Behavioral Defects",
  "Deferred Work",
  "Phase 2 Exit-Criteria Verdict",
  "Phase 3 Readiness Verdict",
  "Git Status",
  "Commit SHA",
]

const errors = []
for (const file of requiredFiles) {
  try {
    const content = await readFile(resolve(root, file), "utf8")
    if (!content.trim()) errors.push(`${file} is empty.`)
  } catch {
    errors.push(`${file} is missing.`)
  }
}

try {
  const report = await readFile(
    resolve(root, "docs/reports/PHASE_2_MONOREPO_FOUNDATION_REPORT.md"),
    "utf8"
  )
  reportSections.forEach((section, index) => {
    if (!report.includes(`## ${index + 1}. ${section}`)) {
      errors.push(`Phase 2 report is missing section ${index + 1}: ${section}.`)
    }
  })
} catch {
  // The missing-file error above is sufficient.
}

const defects = await readFile(
  resolve(root, "docs/KNOWN_BEHAVIORAL_DEFECTS.md"),
  "utf8"
)
if (!defects.includes("MDR-DEFECT-004")) {
  errors.push("Known defects does not include MDR-DEFECT-004.")
}

if (errors.length) {
  console.error(`Phase 2 documentation validation failed with ${errors.length} error(s):`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(
    `Phase 2 documentation validation passed for ${requiredFiles.length} required files and ${reportSections.length} report sections.`
  )
}
