import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const files = [
  "docs/GOOGLE_WORKSPACE_INTEGRATION.md",
  "docs/EXTERNAL_CLIENT_PORTAL.md",
  "docs/IDENTITY_MIGRATION.md",
  "docs/SESSION_SECURITY.md",
  "docs/ROLE_MAPPING.md",
  "docs/THREAT_MODEL.md",
  "docs/GRAPHIFY_PHASE_4.md",
  "docs/CURRENT_STATE.md",
  "docs/ROADMAP.md",
  "docs/CHANGELOG.md",
  "docs/HANDOFF.md",
  "docs/ENVIRONMENT_VARIABLES.md",
  "docs/reports/PHASE_4_IDENTITY_AND_ACCESS_REPORT.md",
]

const contentByFile = new Map()
for (const file of files) {
  const content = await readFile(resolve(root, file), "utf8")
  if (!content.trim()) throw new Error(`${file} is empty.`)
  contentByFile.set(file, content)
}

const report = contentByFile.get(
  "docs/reports/PHASE_4_IDENTITY_AND_ACCESS_REPORT.md"
)
for (const heading of [
  "OIDC Implementation",
  "Account Linking",
  "Supabase Transition",
  "Directory Adapter",
  "Group Mappings",
  "Suspension Behavior",
  "Magic Link Security",
  "Route Protection",
  "Test Inventory",
  "Live Verification Status",
  "Remaining Blockers",
  "Phase 5 Readiness",
  "Commit SHA",
]) {
  if (!report.includes(heading)) {
    throw new Error(`Phase 4 report is missing section: ${heading}.`)
  }
}
if (!report.includes("BLOCKED_EXTERNAL_CREDENTIALS")) {
  throw new Error("Phase 4 report must state the live Workspace gate.")
}
console.log(
  `Phase 4 documentation validation passed for ${files.length} files.`
)
