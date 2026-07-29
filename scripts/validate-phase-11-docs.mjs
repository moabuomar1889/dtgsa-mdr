import { access, readFile } from "node:fs/promises"

const files = [
  "docs/CLIENT_RESPONSE_LIFECYCLE.md",
  "docs/CLIENT_RESPONSE_MATRIX.md",
  "docs/REVISION_MODEL.md",
  "docs/CLIENT_RESPONSE_USER_GUIDE.md",
  "docs/GRAPHIFY_PHASE_11.md",
  "docs/reports/PHASE_11_CLIENT_RESPONSES_AND_REVISIONS_REPORT.md",
]

for (const file of files) await access(file)

const report = await readFile(files.at(-1), "utf8")
for (const phrase of [
  "Policies and Fixtures",
  "Response Files and History",
  "Revision Wizard",
  "Dynamic Downloads",
  "Verification Metrics",
  "Staging Gates",
  "Phase 12 Readiness",
  "79c7c595e956a97cf5d41456d63972342a8e5b28",
]) {
  if (!report.includes(phrase)) {
    throw new Error(`Phase 11 report missing: ${phrase}`)
  }
}

console.log(
  `Phase 11 documentation validation passed for ${files.length} files.`
)
