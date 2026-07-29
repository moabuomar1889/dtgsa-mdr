import { access, readFile } from "node:fs/promises"

const files = [
  "docs/VERIFICATION_MODEL.md",
  "docs/VERIFICATION_PORTAL_USER_GUIDE.md",
  "docs/PUBLIC_VERIFICATION_PRIVACY.md",
  "docs/GRAPHIFY_PHASE_12.md",
  "docs/reports/PHASE_12_VERIFICATION_PORTAL_REPORT.md",
]
for (const file of files) await access(file)
const report = await readFile(files.at(-1), "utf8")
for (const phrase of [
  "Supported Verification Types",
  "Codes, QR, and Privacy",
  "Hash, Manifest, Seal, and Keys",
  "Rate Limit and Audit",
  "PAdES",
  "LEGACY_UNVERIFIABLE",
  "Phase 13 Readiness",
  "0c20c5748dbc8a52f6d4bb6a620beedca37b1ac5",
]) {
  if (!report.includes(phrase))
    throw new Error(`Phase 12 report missing: ${phrase}`)
}
console.log(
  `Phase 12 documentation validation passed for ${files.length} files.`
)
