import { access, readFile } from "node:fs/promises"

const files = [
  "docs/CRYPTOGRAPHIC_MODEL.md",
  "docs/PACKAGE_MANIFEST_SPECIFICATION.md",
  "docs/APPROVAL_EVIDENCE_SPECIFICATION.md",
  "docs/SIGNING_PROVIDER_INTERFACE.md",
  "docs/TIMESTAMP_PROVIDER_INTERFACE.md",
  "docs/VERIFICATION_MODEL.md",
  "docs/AUDIT_MODEL.md",
  "docs/GRAPHIFY_PHASE_6.md",
  "docs/reports/PHASE_6_MANIFEST_AND_EVIDENCE_REPORT.md",
]

for (const file of files) await access(file)
const report = await readFile(files.at(-1), "utf8")
for (const phrase of ["PAdES is deferred", "KMS/HSM", "Phase 7 Readiness"]) {
  if (!report.includes(phrase))
    throw new Error(`Phase 6 report missing: ${phrase}`)
}
console.log(
  `Phase 6 documentation validation passed for ${files.length} files.`
)
