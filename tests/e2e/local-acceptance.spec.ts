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
    page.getByRole("heading", { name: "Choose a test role" })
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
  await adminForm.getByRole("button").click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole("button", { name: /Amina Rahman/ })).toBeVisible()

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
  expect(consoleErrors.join("\n")).not.toContain(
    "Encountered a script tag while rendering React component"
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

test("sidebar navigation preserves the application shell", async ({ page }) => {
  await page.goto("/local-acceptance")
  const adminForm = page.locator("form", {
    has: page.getByText("dc.admin@local.test"),
  })
  await adminForm.getByRole("button").click()

  await page.evaluate(() => {
    const markedWindow = window as typeof window & {
      __dtgNavigationMarker?: string
    }
    markedWindow.__dtgNavigationMarker = "preserved"
  })
  await page.getByRole("link", { name: "Settings", exact: true }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(
    page.getByRole("main").getByText("Settings Hierarchy", { exact: true })
  ).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __dtgNavigationMarker?: string })
          .__dtgNavigationMarker
    )
  ).toBe("preserved")
})

test("protected modules are permission aware", async ({ page }) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text())
    }
  })

  await page.goto("/local-acceptance")
  const adminForm = page.locator("form", {
    has: page.getByText("dc.admin@local.test"),
  })
  await adminForm.getByRole("button").click()

  const protectedLinks = [
    "Transmittals",
    "Client Replies",
    "PDF Tools",
    "Users & Roles",
    "Identity Control",
    "Templates",
    "MDR",
    "PDI Register",
    "Clients",
    "Masters",
  ]
  for (const linkName of protectedLinks) {
    await expect(
      page.getByRole("link", { name: linkName, exact: true })
    ).toBeVisible()
  }

  const authorizedResponse = await page.goto("/transmittals")
  expect(authorizedResponse?.status()).toBe(200)
  await expect(
    page.getByRole("main").getByText("Transmittal records", { exact: true })
  ).toBeVisible()

  await page.goto("/local-acceptance")
  await page.getByText("Choose another role (9)", { exact: true }).click()
  const projectViewerForm = page.locator("form", {
    has: page.getByText("project.viewer@local.test"),
  })
  await projectViewerForm.getByRole("button").click()

  for (const linkName of protectedLinks) {
    await expect(
      page.getByRole("link", { name: linkName, exact: true })
    ).toHaveCount(0)
  }

  // Direct URL access must be refused server-side. The register, PDI, client,
  // masters, and onboarding routes previously rendered in full for this
  // dashboard-only role because navigation hid the links but no page or
  // service enforced the permission.
  const protectedPaths = [
    "/transmittals",
    "/replies",
    "/pdf-tools",
    "/admin/users",
    "/admin/identity",
    "/templates",
    "/templates/designer",
    "/mdr",
    "/pdi",
    "/clients",
    "/masters",
    "/projects/new",
  ]
  // The routes stream a shell before the permission check resolves, so the
  // response status is committed as 200 and the denial is expressed by the
  // rendered restricted state. See docs/HANDOFF.md for the recorded decision.
  for (const path of protectedPaths) {
    await page.goto(path)
    await expect(
      page.getByRole("heading", { name: "Access restricted" }).first(),
      path
    ).toBeVisible()
  }

  // Module content must not be present anywhere in the denied document.
  const deniedRegisterBody = await page.goto("/mdr").then(() => page.content())
  expect(deniedRegisterBody).not.toContain(
    "MDR records are now visible as the operational destination"
  )
  expect(consoleErrors.join("\n")).not.toContain(
    "Encountered a script tag while rendering React component"
  )
})

test("application shell matches the Nocturne design geometry", async ({
  page,
}) => {
  await page.goto("/local-acceptance")
  const adminForm = page.locator("form", {
    has: page.getByText("dc.admin@local.test"),
  })
  await adminForm.getByRole("button").click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.waitForLoadState("networkidle")

  // Design §4 fixes these exactly; they are read from the live DOM rather than
  // from class names so a cascade regression in the sidebar primitive is caught.
  const geometry = await page.evaluate(() => {
    const header = document.querySelector("header")!.getBoundingClientRect()
    const sidebar = document
      .querySelector('[data-slot="sidebar-container"]')!
      .getBoundingClientRect()
    return {
      headerHeight: header.height,
      sidebarWidth: sidebar.width,
      sidebarBottom: Math.round(sidebar.bottom),
      viewportHeight: window.innerHeight,
    }
  })
  expect(geometry.headerHeight).toBe(50)
  expect(geometry.sidebarWidth).toBe(208)
  expect(geometry.sidebarBottom).toBe(geometry.viewportHeight)

  // The switcher replaced the static portfolio link.
  await page.getByRole("button", { name: "Switch project" }).click()
  await expect(page.getByPlaceholder(/^Search \d+ projects/)).toBeVisible()
})
