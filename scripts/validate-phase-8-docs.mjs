import { access, readFile } from "node:fs/promises"

const files = [
  "docs/COVER_TEMPLATE_SPECIFICATION.md",
  "docs/PREPARED_BY_MANAGER_SPECIFICATION.md",
  "docs/COVER_DESIGNER_USER_GUIDE.md",
  "docs/COVER_RENDERING_MODEL.md",
  "docs/GRAPHIFY_PHASE_8.md",
  "docs/reports/PHASE_8_COVER_DESIGNER_REPORT.md",
]
for (const file of files) await access(file)
const report = await readFile(files.at(-1), "utf8")
for (const phrase of [
  "Designer UI",
  "Prepared By Manager",
  "Client Legend",
  "Legacy Compatibility",
  "Phase 9 Readiness",
]) {
  if (!report.includes(phrase)) {
    throw new Error(`Phase 8 report missing: ${phrase}`)
  }
}
console.log(
  `Phase 8 documentation validation passed for ${files.length} files.`
)
