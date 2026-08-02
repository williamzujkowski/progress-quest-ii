import { expect, test } from '@playwright/test';

test.describe('Progress Quest Web Application', () => {
  test('renders initial application page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Vite|Progress Quest/i);
  });
});
