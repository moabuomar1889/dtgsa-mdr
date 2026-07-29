import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "local-acceptance.spec.ts",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  outputDir: ".local-runtime/artifacts/playwright",
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: ".local-runtime/artifacts/playwright-results.json" },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
})
