// Measures time-to-first-byte vs full-response time for authenticated routes.
// TTFB is the proxy for "when does the user see something"; the gap between
// the two columns is what streaming buys.
const BASE = process.env.BENCH_BASE ?? "http://127.0.0.1:3100"
const IDENTITY = process.env.BENCH_IDENTITY ?? "dc.admin@local.test"
const ROUTES = [
  "/dashboard",
  "/mdr",
  "/pdi",
  "/transmittals",
  "/replies",
  "/reports",
  "/tasks",
  "/projects",
]
const RUNS = Number(process.env.BENCH_RUNS ?? 5)

async function login() {
  const response = await fetch(`${BASE}/local-acceptance/session`, {
    method: "POST",
    body: new URLSearchParams({ email: IDENTITY }),
    redirect: "manual",
  })
  const cookie = (response.headers.getSetCookie?.() ?? [])
    .map((entry) => entry.split(";")[0])
    .join("; ")
  if (!cookie.includes("dtg_internal_session")) {
    throw new Error(`login failed: ${response.status}`)
  }
  return cookie
}

async function measure(cookie, route) {
  const started = process.hrtime.bigint()
  const response = await fetch(`${BASE}${route}`, {
    headers: { cookie },
    redirect: "manual",
  })
  const reader = response.body.getReader()
  let ttfb = null
  for (;;) {
    const { done } = await reader.read()
    if (ttfb === null) ttfb = Number(process.hrtime.bigint() - started) / 1e6
    if (done) break
  }
  const total = Number(process.hrtime.bigint() - started) / 1e6
  return { ttfb, total, status: response.status }
}

const cookie = await login()
for (let i = 0; i < 3; i += 1)
  for (const route of ROUTES) await measure(cookie, route)

const rows = []
for (const route of ROUTES) {
  const ttfbs = []
  const totals = []
  let status = 0
  for (let i = 0; i < RUNS; i += 1) {
    const result = await measure(cookie, route)
    ttfbs.push(result.ttfb)
    totals.push(result.total)
    status = result.status
  }
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)].toFixed(0)
  }
  rows.push({ route, status, ttfb_ms: median(ttfbs), total_ms: median(totals) })
}
console.log(`label=${process.env.BENCH_LABEL ?? "run"} identity=${IDENTITY}`)
console.table(rows)
