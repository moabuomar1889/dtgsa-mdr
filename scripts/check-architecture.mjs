import { readFile, readdir, stat } from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const rootArgumentIndex = process.argv.indexOf("--root")
const root =
  rootArgumentIndex >= 0
    ? resolve(process.argv[rootArgumentIndex + 1])
    : scriptRoot
const skipRoutes = process.argv.includes("--skip-routes")
const errors = []

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function childDirectories(path) {
  if (!(await exists(path))) return []
  const entries = await readdir(path, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(path, entry.name))
}

async function sourceFiles(path) {
  if (!(await exists(path))) return []
  const entries = await readdir(path, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (["node_modules", ".next", "dist"].includes(entry.name)) continue
    const entryPath = join(path, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(entryPath)))
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      files.push(entryPath)
    }
  }

  return files
}

function findCycles(graph) {
  const cycles = []
  const visiting = new Set()
  const visited = new Set()

  function visit(node, path) {
    if (visiting.has(node)) {
      const index = path.indexOf(node)
      cycles.push([...path.slice(index), node])
      return
    }
    if (visited.has(node)) return

    visiting.add(node)
    for (const dependency of graph.get(node) ?? []) {
      visit(dependency, [...path, node])
    }
    visiting.delete(node)
    visited.add(node)
  }

  for (const node of graph.keys()) visit(node, [])
  return cycles
}

function importSpecifiers(source) {
  const specifiers = []
  const pattern =
    /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g
  let match
  while ((match = pattern.exec(source))) specifiers.push(match[1])
  return specifiers
}

function routeFromFile(appDirectory, file) {
  const routeDirectory = dirname(relative(appDirectory, file))
  const segments = routeDirectory
    .split(sep)
    .filter(
      (segment) =>
        segment &&
        segment !== "." &&
        !(segment.startsWith("(") && segment.endsWith(")")) &&
        !segment.startsWith("@")
    )
  return segments.length ? `/${segments.join("/")}` : "/"
}

const appDirectories = await childDirectories(join(root, "apps"))
const packageDirectories = await childDirectories(join(root, "packages"))
const units = [
  ...appDirectories.map((path) => ({ kind: "app", path })),
  ...packageDirectories.map((path) => ({ kind: "package", path })),
]
const manifests = new Map()

for (const unit of units) {
  const manifestPath = join(unit.path, "package.json")
  if (!(await exists(manifestPath))) {
    errors.push(`Missing package manifest: ${relative(root, unit.path)}`)
    continue
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
  manifests.set(manifest.name, { ...unit, manifest })
}

const dependencyGraph = new Map()
for (const [name, unit] of manifests) {
  const declared = {
    ...unit.manifest.dependencies,
    ...unit.manifest.devDependencies,
    ...unit.manifest.peerDependencies,
  }
  const internalDependencies = Object.keys(declared).filter((dependency) =>
    manifests.has(dependency)
  )
  dependencyGraph.set(name, internalDependencies)

  for (const dependency of internalDependencies) {
    if (declared[dependency] !== "workspace:*") {
      errors.push(`${name} must declare ${dependency} with workspace:*.`)
    }
  }
}

for (const cycle of findCycles(dependencyGraph)) {
  errors.push(`Workspace dependency cycle: ${cycle.join(" -> ")}`)
}

for (const [name, unit] of manifests) {
  for (const file of await sourceFiles(join(unit.path, "src"))) {
    const source = await readFile(file, "utf8")
    for (const specifier of importSpecifiers(source)) {
      if (/^@dtg\/[^/]+\/.+/.test(specifier)) {
        errors.push(`Deep workspace import in ${relative(root, file)}: ${specifier}`)
      }

      if (unit.kind === "package" && /(^|\/)apps\//.test(specifier)) {
        errors.push(`Package ${name} imports application code: ${specifier}`)
      }

      if (specifier.startsWith(".")) {
        const target = resolve(dirname(file), specifier)
        const appsRoot = `${resolve(root, "apps")}${sep}`
        if (unit.kind === "package" && target.startsWith(appsRoot)) {
          errors.push(`Package ${name} imports application source from ${specifier}.`)
        }
        if (unit.kind === "app" && target.startsWith(appsRoot)) {
          const ownRoot = `${resolve(unit.path)}${sep}`
          if (!target.startsWith(ownRoot)) {
            errors.push(`Application ${name} imports another application: ${specifier}`)
          }
        }
      }

      if (
        name === "@dtg/contracts" &&
        (/^@prisma\//.test(specifier) ||
          specifier === "next" ||
          specifier.startsWith("next/") ||
          specifier.startsWith("@/"))
      ) {
        errors.push(`@dtg/contracts has forbidden dependency: ${specifier}`)
      }

      if (
        name === "@dtg/database" &&
        (specifier === "react" ||
          specifier.startsWith("react/") ||
          specifier === "@dtg/ui" ||
          specifier === "next" ||
          specifier.startsWith("next/"))
      ) {
        errors.push(`@dtg/database imports UI/application dependency: ${specifier}`)
      }

      if (
        ["@dtg/contracts", "@dtg/configuration", "@dtg/observability", "@dtg/ui"].includes(name) &&
        specifier === "@dtg/database"
      ) {
        errors.push(`Browser-safe package ${name} imports @dtg/database.`)
      }
    }
  }
}

if (!skipRoutes && root === scriptRoot) {
  const expected = JSON.parse(
    await readFile(
      join(root, "tests/fixtures/architecture/mdr-routes.json"),
      "utf8"
    )
  )
  const appDirectory = join(root, "apps/mdr-web/src/app")
  const routeFiles = (await sourceFiles(appDirectory)).filter((file) =>
    /(?:page|route)\.[jt]sx?$/.test(file)
  )
  const actual = [...new Set(routeFiles.map((file) => routeFromFile(appDirectory, file)))].sort()

  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    errors.push(
      `MDR route inventory mismatch.\nExpected: ${expected.join(", ")}\nActual: ${actual.join(", ")}`
    )
  }
}

if (errors.length) {
  console.error(`Architecture validation failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(
    `Architecture validation passed for ${appDirectories.length} apps and ${packageDirectories.length} packages; no workspace cycles found.`
  )
}
