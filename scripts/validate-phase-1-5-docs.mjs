import { readFile } from "node:fs/promises"

const report = "docs/reports/PHASE_1_5_DATABASE_CHARACTERIZATION_REPORT.md"
const defects = "docs/KNOWN_BEHAVIORAL_DEFECTS.md"
const failures = []
const reportContent = await readFile(report, "utf8")
const defectContent = await readFile(defects, "utf8")

for (let section = 1; section <= 32; section += 1) {
  if (!reportContent.includes(`## ${section}.`)) {
    failures.push(`${report}: missing section ${section}`)
  }
}

for (const id of ["MDR-DEFECT-001", "MDR-DEFECT-002", "MDR-DEFECT-003"]) {
  if (!defectContent.includes(id)) {
    failures.push(`${defects}: missing ${id}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exitCode = 1
} else {
  console.log(
    "Phase 1.5 documentation validation passed (32 sections, 3 defects)."
  )
}
