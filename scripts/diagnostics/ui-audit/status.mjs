const BASE = "http://127.0.0.1:3100"
async function login(email) {
  const r = await fetch(`${BASE}/local-acceptance/session`, {
    method: "POST",
    body: new URLSearchParams({ email }),
    redirect: "manual",
  })
  return (r.headers.getSetCookie?.() ?? [])
    .map((e) => e.split(";")[0])
    .join("; ")
}
const cookie = await login("project.viewer@local.test")
const rows = []
for (const path of [
  "/transmittals",
  "/replies",
  "/pdf-tools",
  "/admin/users",
  "/templates",
  "/mdr",
  "/pdi",
  "/clients",
  "/masters",
  "/dashboard",
]) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie },
    redirect: "manual",
  })
  await res.text()
  rows.push({ path, status: res.status })
}
console.table(rows)
