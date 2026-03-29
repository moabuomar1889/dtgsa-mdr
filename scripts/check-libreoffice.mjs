import { constants } from "node:fs"
import { access } from "node:fs/promises"
import { spawnSync } from "node:child_process"

const candidates =
  process.platform === "win32"
    ? [
        process.env.LIBREOFFICE_PATH,
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
        "soffice.exe",
        "soffice",
      ]
    : [process.env.LIBREOFFICE_PATH, "soffice", "libreoffice"]

async function canUseCandidate(candidate) {
  if (!candidate) {
    return false
  }

  if (candidate.includes("\\") || candidate.includes("/")) {
    try {
      await access(candidate, constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  return true
}

async function main() {
  for (const candidate of candidates) {
    if (!(await canUseCandidate(candidate))) {
      continue
    }

    const result = spawnSync(candidate, ["--version"], {
      encoding: "utf8",
    })

    if (result.status === 0) {
      const version = result.stdout.trim() || result.stderr.trim() || "unknown"
      console.log(`LibreOffice detected via ${candidate}: ${version}`)
      return
    }
  }

  console.error(
    "LibreOffice headless not found. Install LibreOffice or set LIBREOFFICE_PATH before running DOCX -> PDF conversion.",
  )
  process.exit(1)
}

await main()
