import { defineConfig } from "@playwright/test";

// The extension must be built for Chromium first: `npm run build:chromium`.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
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
