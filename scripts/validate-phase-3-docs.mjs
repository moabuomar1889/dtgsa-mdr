import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const files = [
  "docs/DATABASE_FOUNDATION.md",
  "docs/DATABASE_OWNERSHIP.md",
  "docs/DATABASE_CONSTRAINTS.md",
  "docs/DATABASE_ROLES.md",
  "docs/DATABASE_MIGRATION_PLAN.md",
  "docs/DATA_MODEL.md",
  "docs/GRAPHIFY_PHASE_3.md",
  "docs/reports/PHASE_3_DATABASE_FOUNDATION_REPORT.md",
]
for (const file of files) {
  const content = await readFile(resolve(root, file), "utf8")
  if (!content.trim()) throw new Error(`${file} is empty.`)
}
console.log(
  `Phase 3 documentation validation passed for ${files.length} files.`
)
