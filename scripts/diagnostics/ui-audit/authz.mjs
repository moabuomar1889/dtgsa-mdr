// Checks that direct URL access is enforced server-side, not just hidden in nav.
const BASE = "http://127.0.0.1:3100"
const ROUTES = [
  "/dashboard",
  "/mdr",
  "/pdi",
  "/clients",
  "/masters",
  "/projects",
  "/projects/new",
  "/transmittals",
  "/replies",
  "/reports",
  "/tasks",
  "/audit",
  "/templates",
  "/admin/users",
]
const IDENTITIES = [
  "dc.admin@local.test",
  "project.viewer@local.test",
  "reviewer@local.test",
]

async function login(email) {
  const response = await fetch(`${BASE}/local-acceptance/session`, {
    method: "POST",
    body: new URLSearchParams({ email }),
    redirect: "manual",
  })
  return (response.headers.getSetCookie?.() ?? [])
    .map((entry) => entry.split(";")[0])
    .join("; ")
}

for (const identity of IDENTITIES) {
  const cookie = await login(identity)
  const rows = []
  for (const route of ROUTES) {
    const response = await fetch(`${BASE}${route}`, {
      headers: { cookie },
      redirect: "manual",
    })
    const body = await response.text()
    const restricted =
      body.includes("Access restricted") || body.includes("Permission required")
    const moduleError = body.includes("Module error")
    rows.push({
      route,
      status: response.status,
      outcome: restricted
        ? "FORBIDDEN_PAGE"
        : moduleError
          ? "MODULE_ERROR"
          : response.status === 200
            ? "ALLOWED"
            : String(response.status),
    })
  }
  console.log(`\n### ${identity}`)
  console.table(rows)
}
