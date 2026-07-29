import { access, readFile } from "node:fs/promises"

const files = [
  "docs/REVIEW_VIEWER_SPECIFICATION.md",
  "docs/COMMENT_MODEL.md",
  "docs/APPROVAL_APPLICATION_USER_GUIDE.md",
  "docs/HELP.md",
  "docs/GRAPHIFY_PHASE_9.md",
  "docs/reports/PHASE_9_APPROVAL_APPLICATION_REPORT.md",
]
for (const file of files) await access(file)
const report = await readFile(files.at(-1), "utf8")
for (const phrase of [
  "Range Metrics",
  "Review Sessions",
  "Comments",
  "Signatures",
  "MDR Integration",
  "Phase 10 Readiness",
]) {
  if (!report.includes(phrase)) {
    throw new Error(`Phase 9 report missing: ${phrase}`)
  }
}
console.log(
  `Phase 9 documentation validation passed for ${files.length} files.`
)
