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
// Body-only sentences, not present in the shared client shell payload.
const MARKERS = {
  "/mdr": "MDR records are now visible as the operational destination",
  "/pdi": "The Project Document Index is now a working register",
  "/clients": "Client profiles define the inheritance starting point",
  "/masters": "Global coding tables are now backed by real data",
  "/projects/new": "Create a project by linking it to the correct Shared Drive",
}
for (const email of [
  "dc.admin@local.test",
  "project.viewer@local.test",
  "reviewer@local.test",
]) {
  const cookie = await login(email)
  const rows = []
  for (const [route, marker] of Object.entries(MARKERS)) {
    const res = await fetch(`${BASE}${route}`, {
      headers: { cookie },
      redirect: "manual",
    })
    const body = await res.text()
    rows.push({
      route,
      moduleRendered: body.includes(marker) ? "YES" : "DENIED",
    })
  }
  console.log(`\n### ${email}`)
  console.table(rows)
}
