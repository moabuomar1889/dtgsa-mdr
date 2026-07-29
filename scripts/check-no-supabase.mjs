import { readFile, readdir } from "node:fs/promises"
import { extname, join, relative, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const checkerPath = "scripts/check-no-supabase.mjs"
const retiredName = ["supa", "base"].join("")
const forbidden = [
  retiredName,
  `@${retiredName}`,
  ["legacy", retiredName].join("_"),
  "dual_transition",
]
const roots = [
  "apps",
  "packages",
  "prisma",
  "scripts",
  "tests",
  "config",
  "infrastructure",
  ".github",
]
const textExtensions = new Set([
  ".cjs",
  ".env",
  ".js",
  ".json",
  ".mjs",
  ".prisma",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
])

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".local-runtime" ||
      entry.name === ".next" ||
      entry.name === "dist" ||
      entry.name === "coverage"
    ) {
      continue
    }
    const absolute = join(path, entry.name)
    if (entry.isDirectory()) files.push(...(await collect(absolute)))
    else if (textExtensions.has(extname(entry.name))) files.push(absolute)
  }
  return files
}

const files = [
  ...(
    await Promise.all(roots.map((directory) => collect(join(root, directory))))
  ).flat(),
  join(root, "package.json"),
  join(root, "pnpm-lock.yaml"),
  join(root, ".env.example"),
]
const failures = []

for (const file of new Set(files)) {
  const repositoryPath = relative(root, file).replaceAll("\\", "/")
  if (repositoryPath === checkerPath) continue
  let content = await readFile(file, "utf8")
  if (repositoryPath === "package.json") {
    const manifest = JSON.parse(content)
    delete manifest.scripts?.[`check:no-${retiredName}`]
    content = JSON.stringify(manifest)
  }
  content = content.replaceAll(`check:no-${retiredName}`, "")
  const normalized = content.toLowerCase()
  const matched = forbidden.find((term) => normalized.includes(term))
  if (matched)
    failures.push(`${repositoryPath}: contains retired provider reference`)
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exitCode = 1
} else {
  console.log(
    "Retired provider gate passed for active source and configuration."
  )
}
