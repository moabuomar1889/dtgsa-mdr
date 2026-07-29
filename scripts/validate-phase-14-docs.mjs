import { access, readFile } from "node:fs/promises"
const files = [
  "docs/DEPLOYMENT.md",
  "docs/COOLIFY_DEPLOYMENT.md",
  "docs/CI_CD.md",
  "docs/OBSERVABILITY.md",
  "docs/BACKUP_AND_RECOVERY.md",
  "docs/DISASTER_RECOVERY.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "docs/SECURITY_OPERATIONS.md",
  "docs/GRAPHIFY_PHASE_14.md",
  "docs/reports/PHASE_14_DEVOPS_AND_OPERATIONS_REPORT.md",
]
for (const file of files) await access(file)
const report = await readFile(files.at(-1), "utf8")
for (const phrase of [
  "Containers and Coolify",
  "Database and CI",
  "Monitoring and Logging",
  "Backup, Restore, and Recovery",
  "NOT_AUTHORIZED_NOT_ATTEMPTED",
  "Phase 15 Readiness",
]) {
  if (!report.includes(phrase))
    throw new Error(`Phase 14 report missing: ${phrase}`)
}
console.log(
  `Phase 14 documentation validation passed for ${files.length} files.`
)
