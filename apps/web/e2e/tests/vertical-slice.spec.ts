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


