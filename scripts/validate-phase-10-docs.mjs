import { access, readFile } from "node:fs/promises"

const files = [
  "docs/WORKER_ARCHITECTURE.md",
  "docs/OUTBOX_MODEL.md",
  "docs/DOWNLOAD_ASSEMBLY_MODEL.md",
  "docs/TRANSMITTAL_DELIVERY.md",
  "docs/TEMPORARY_FILE_SECURITY.md",
  "docs/OBSERVABILITY.md",
  "docs/runbooks/WORKER_OPERATIONS.md",
  "docs/GRAPHIFY_PHASE_10.md",
  "docs/reports/PHASE_10_DOWNLOADS_AND_WORKER_REPORT.md",
]
for (const file of files) await access(file)
const report = await readFile(files.at(-1), "utf8")
for (const phrase of [
  "Durable Engine",
  "Download Assembly",
  "Large Files",
  "Transmittal",
  "Verification Metrics",
  "Phase 11 Readiness",
]) {
  if (!report.includes(phrase)) {
    throw new Error(`Phase 10 report missing: ${phrase}`)
  }
}
console.log(
  `Phase 10 documentation validation passed for ${files.length} files.`
)
