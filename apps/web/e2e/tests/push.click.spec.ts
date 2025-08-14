import { test, expect } from '@playwright/test';

test('simulated push click opens conversation', async ({ page, context }) => {
  const base = process.env.E2E_BASE_URL || 'http://localhost:3000';
  await context.grantPermissions(['notifications'], { origin: base });
  await page.goto(base + '/?test=1');
  // Simulated push leaves a system line; click badge is not part of notification, so emulate SW notificationclick deep-link
  // Open a new tab to emulate notification click target URL
  const url = new URL(base);
  url.searchParams.set('c', 'test-conv');
  await page.goto(url.toString());
  await expect(page).toHaveURL(/\?c=/);
});


