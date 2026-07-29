import { access, readFile } from "node:fs/promises"

const files = [
  "docs/API_CONTRACT.md",
  "docs/INTEGRATION_GUIDE.md",
  "docs/WEBHOOKS.md",
  "docs/GENERAL_REQUESTS.md",
  "docs/ACCOUNTING_INTEGRATION_EXAMPLE.md",
  "docs/HR_INTEGRATION_EXAMPLE.md",
  "docs/GRAPHIFY_PHASE_13.md",
  "docs/reports/PHASE_13_INTEGRATIONS_AND_GENERAL_REQUESTS_REPORT.md",
]
for (const file of files) await access(file)
const report = await readFile(files.at(-1), "utf8")
for (const phrase of [
  "Versioned API",
  "Scopes and Service Clients",
  "Idempotency",
  "Webhooks",
  "General Requests",
  "SDK and Integration UX",
  "Privacy",
  "Test Evidence",
  "Phase 14 Readiness",
]) {
  if (!report.includes(phrase))
    throw new Error(`Phase 13 report missing: ${phrase}`)
}
console.log(
  `Phase 13 documentation validation passed for ${files.length} files.`
)
