import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/prod",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-prod" }]],
  use: {
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/prod",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-prod" }]],
  use: {
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
});


