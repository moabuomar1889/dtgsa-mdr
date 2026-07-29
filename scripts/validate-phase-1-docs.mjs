import { readFile } from "node:fs/promises"

const requiredSections = {
  "docs/CHARACTERIZATION_TEST_STRATEGY.md": [
    "# Characterization Test Strategy",
    "## Purpose",
    "## Test Boundaries",
    "## Database Safety",
    "## Known Coverage Gaps",
  ],
  "docs/reports/PHASE_1_CHARACTERIZATION_TEST_REPORT.md": [
    "# Phase 1 Characterization Test Report",
    "## 1. Executive Summary",
    "## 7. Test Suite Inventory",
    "## 22. Exact Pass/Fail/Skip Counts",
    "## 30. Phase 1 Exit-Criteria Verdict",
    "## 31. Phase 2 Readiness Verdict",
  ],
}

const failures = []

for (const [file, sections] of Object.entries(requiredSections)) {
  const content = await readFile(file, "utf8")

  for (const section of sections) {
    if (!content.includes(section)) {
      failures.push(`${file}: missing "${section}"`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exitCode = 1
} else {
  console.log(
    `Phase 1 documentation validation passed (${Object.keys(requiredSections).length} files).`
  )
}
