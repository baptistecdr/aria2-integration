import { defineConfig } from "@playwright/test";

// Run with `npm run test:e2e`, which builds the extension for both browsers first.
// aria2 runs in Docker (compose.yaml), started by the global setup.
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Tests share a single aria2 daemon, so they must not run in parallel.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // On CI, the JSON report feeds the pull request comment (see .github/workflows/e2e-report-pr.yml).
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }], ["json", { outputFile: "playwright-report/results.json" }]] : "list",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    // Loads the extension built in dist by `npm run build:chromium`.
    { name: "chromium", testIgnore: "firefox/**" },
    // Drives Firefox through WebDriver BiDi and loads the extension built in dist-firefox by `npm run build:firefox:e2e`.
    // Set FIREFOX_PATH when Firefox is not at its default location.
    { name: "firefox", testMatch: "firefox/**/*.spec.ts" },
  ],
});
