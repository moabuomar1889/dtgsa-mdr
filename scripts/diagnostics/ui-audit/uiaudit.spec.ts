import { test, type Response } from "@playwright/test"

const ROUTES = [
  "/dashboard",
  "/mdr",
  "/pdi",
  "/transmittals",
  "/replies",
  "/reports",
  "/tasks",
  "/projects",
  "/settings",
  "/templates/designer",
]

interface UiAuditRow {
  route: string
  jsKB: number
  jsReqs: number
  cssKB: number
  otherKB: number
  domNodes: number
  domDepth: number
  fcp: number
  domInteractive: number
  longTaskMs: number
  listeners: number
  loadMs: number
}

test("ui weight audit", async ({ page }) => {
  await page.goto("/local-acceptance")
  await page
    .locator("form", { has: page.getByText("dc.admin@local.test") })
    .getByRole("button", { name: "Select identity" })
    .click()
  await page.waitForURL(/\/dashboard$/)

  const rows: UiAuditRow[] = []
  for (const route of ROUTES) {
    let js = 0,
      jsCount = 0,
      css = 0,
      other = 0
    const onResponse = async (res: Response) => {
      const url = res.url()
      let len = Number(res.headers()["content-length"] ?? 0)
      if (!len) {
        try {
          len = (await res.body()).length
        } catch {
          len = 0
        }
      }
      if (url.endsWith(".js") || url.includes("/_next/static/chunks")) {
        js += len
        jsCount += 1
      } else if (url.endsWith(".css")) css += len
      else other += len
    }
    page.on("response", onResponse)
    const started = Date.now()
    await page.goto(route, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")
    const loadMs = Date.now() - started
    page.off("response", onResponse)

    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming
      const paints = performance.getEntriesByType("paint")
      const longTasks = performance.getEntriesByType("longtask")
      return {
        domNodes: document.getElementsByTagName("*").length,
        domDepth: (function d(n: Element): number {
          let m = 0
          for (const c of Array.from(n.children)) m = Math.max(m, d(c))
          return m + 1
        })(document.body),
        fcp: Math.round(
          paints.find((p) => p.name === "first-contentful-paint")?.startTime ??
            0
        ),
        domInteractive: Math.round(nav?.domInteractive ?? 0),
        longTaskMs: Math.round(longTasks.reduce((s, t) => s + t.duration, 0)),
        listeners: document.querySelectorAll("[data-h],[data-b],[data-r]")
          .length,
      }
    })
    rows.push({
      route,
      jsKB: +(js / 1024).toFixed(0),
      jsReqs: jsCount,
      cssKB: +(css / 1024).toFixed(0),
      otherKB: +(other / 1024).toFixed(0),
      ...m,
      loadMs,
    })
  }
  console.log("UIAUDIT " + JSON.stringify(rows))
})
