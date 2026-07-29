import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"

test.beforeAll(async () => {
  await mkdir(".local-runtime/screenshots", { recursive: true })
})

test("local dashboard, service surfaces, CSP, and identity switching", async ({
  page,
  request,
}) => {
  const externalRequests: string[] = []
  const consoleErrors: string[] = []
  page.on("request", (browserRequest) => {
    const url = new URL(browserRequest.url())
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      externalRequests.push(browserRequest.url())
    }
  })
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text())
    }
  })

  const response = await page.goto("/local-acceptance")
  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole("heading", { name: "Local acceptance control room" })
  ).toBeVisible()
  await expect(
    page.getByText("LOCAL DEVELOPMENT APPLICATION SEAL")
  ).toBeVisible()
  await page.screenshot({
    path: ".local-runtime/screenshots/local-acceptance-dashboard.png",
    fullPage: true,
  })

  const csp = response?.headers()["content-security-policy"] ?? ""
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
  expect(csp).not.toContain("connect-src 'self' https:")

  const adminForm = page.locator("form", {
    has: page.getByText("dc.admin@local.test"),
  })
  await adminForm.getByRole("button", { name: "Select identity" }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText("Amina Rahman")).toBeVisible()

  const services = [
    "http://127.0.0.1:3101/api/ready",
    "http://127.0.0.1:3102/api/ready",
    "http://127.0.0.1:4100/ready",
    "http://127.0.0.1:4101/health",
  ]
  for (const url of services) {
    const service = await request.get(url)
    expect(service.status(), url).toBe(200)
  }

  await page.goto("http://127.0.0.1:4101")
  await expect(
    page.getByRole("heading", { name: "Local email sink" })
  ).toBeVisible()
  expect(consoleErrors.join("\n")).not.toContain(
    "eval() is not supported in this environment"
  )
  expect(externalRequests).toEqual([])
})

test("local identity endpoint refuses non-synthetic accounts", async ({
  request,
}) => {
  const response = await request.post(
    "http://127.0.0.1:3100/local-acceptance/session",
    {
      form: { email: "real@example.com" },
      maxRedirects: 0,
    }
  )
  expect(response.status()).toBe(400)
})
