import { test, expect } from '@playwright/test';

test('guest starts chat and receives agent auto-reply; transcript persists', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Chat' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Message' }).fill('Hello');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('user: Hello')).toBeVisible();
  await expect(page.getByText('agent: Thanks! An agent will be with you shortly.')).toBeVisible();
  await page.reload();
  // On reload, transcript should still show both messages (from API listing)
  await expect(page.getByText('user: Hello')).toBeVisible();
  await expect(page.getByText('agent: Thanks! An agent will be with you shortly.')).toBeVisible();
});

test('simulated push increments badge when notifications denied', async ({ page }) => {
  // Deny notifications via context default; visit with test flag so app simulates push on new conversation
  await page.goto('/?test=1');
  // Wait for heading with optional badge
  await expect(page.getByRole('heading', { name: /Chat/ })).toBeVisible();
  // Expect simulated push message and badge
  await expect(page.getByText('Simulated push received')).toBeVisible();
  await expect(page.getByLabel('badge')).toBeVisible();
});


