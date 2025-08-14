import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PRODUCTION_URL || "https://your-app.example.com";
const ADMIN_URL = process.env.ADMIN_PRODUCTION_URL || "https://your-admin.example.com";
const API_URL = process.env.API_PRODUCTION_URL || "https://your-api.example.com";
const AIBOT_URL = process.env.AI_PRODUCTION_URL || "https://your-ai-bot.example.com";

test.describe("Production smoke", () => {
  test("Home page loads and shows chat entry", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/chat|support|help/i);
    await expect(page.locator("body")).toContainText(/chat|start/i);
  });

  test("Notifications denied path shows fallback", async ({ page, context }) => {
    await context.grantPermissions([], { origin: BASE_URL });
    await page.goto(BASE_URL);
    await expect(page.locator("[data-test=fallback-alert]")).toBeVisible({ timeout: 10000 });
  });

  test("Admin login page renders", async ({ page }) => {
    await page.goto(ADMIN_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/sign in|magic link|email/i);
  });

  test("API healthz is healthy", async ({ request }) => {
    const r = await request.get(`${API_URL}/healthz`);
    expect(r.status()).toBeLessThan(400);
  });

  test("AI bot healthz is healthy", async ({ request }) => {
    const r = await request.get(`${AIBOT_URL}/healthz`);
    expect(r.status()).toBeLessThan(400);
  });
});

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PRODUCTION_URL || "https://your-app.example.com";
const ADMIN_URL = process.env.ADMIN_PRODUCTION_URL || "https://your-admin.example.com";
const API_URL = process.env.API_PRODUCTION_URL || "https://your-api.example.com";
const AIBOT_URL = process.env.AI_PRODUCTION_URL || "https://your-ai-bot.example.com";

test.describe("Production smoke", () => {
  test("Home page loads and shows chat entry", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/chat|support|help/i);
    await expect(page.locator("body")).toContainText(/chat|start/i);
  });

  test("Notifications denied path shows fallback", async ({ page, context }) => {
    await context.grantPermissions([], { origin: BASE_URL });
    await page.goto(BASE_URL);
    await expect(page.locator("[data-test=fallback-alert]")).toBeVisible({ timeout: 10000 });
  });

  test("Admin login page renders", async ({ page }) => {
    await page.goto(ADMIN_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/sign in|magic link|email/i);
  });

  test("API healthz is healthy", async ({ request }) => {
    const r = await request.get(`${API_URL}/healthz`);
    expect(r.status()).toBeLessThan(400);
  });

  test("AI bot healthz is healthy", async ({ request }) => {
    const r = await request.get(`${AIBOT_URL}/healthz`);
    expect(r.status()).toBeLessThan(400);
  });
});


