import "server-only"
import { constants } from "node:fs"
import { access } from "node:fs/promises"
import { basename, extname, join } from "node:path"
import { spawn } from "node:child_process"
import { env } from "@/lib/config/env"

const defaultCandidates =
  process.platform === "win32"
    ? [
        env.LIBREOFFICE_PATH,
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
        "soffice.exe",
        "soffice",
      ]
    : [env.LIBREOFFICE_PATH, "soffice", "libreoffice"]

async function canUseCandidate(candidate: string) {
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

async function runProcess(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stderr = ""

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(
          stderr.trim() || `LibreOffice process exited with code ${code}.`,
        ),
      )
    })
  })
}

export async function resolveLibreOfficePath() {
  const candidates = defaultCandidates.filter(
    (candidate): candidate is string => Boolean(candidate),
  )

  for (const candidate of candidates) {
    if (!(await canUseCandidate(candidate))) {
      continue
    }

    try {
      await runProcess(candidate, ["--version"])
      return candidate
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    "LibreOffice headless was not found. Set LIBREOFFICE_PATH or install LibreOffice.",
  )
}

export async function assertLibreOfficeAvailable() {
  return resolveLibreOfficePath()
}

export async function convertDocxToPdf(inputPath: string, outputDir: string) {
  const libreOfficePath = await resolveLibreOfficePath()

  await runProcess(libreOfficePath, [
    "--headless",
    "--convert-to",
    "pdf:writer_pdf_Export",
    "--outdir",
    outputDir,
    inputPath,
  ])

  return join(outputDir, `${basename(inputPath, extname(inputPath))}.pdf`)
}
