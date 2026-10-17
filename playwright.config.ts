import { defineConfig } from "@playwright/test";

// The extension must be built for Chromium first: `npm run build:chromium`.
// aria2 runs in Docker (compose.yaml), started by the global setup.
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Tests share a single aria2 daemon, so they must not run in parallel.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    trace: "retain-on-failure",
  },
});
