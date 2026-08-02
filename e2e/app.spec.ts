import { expect, test } from '@playwright/test';

test.describe('Progress Quest Web Application UI', () => {
  test('renders full game interface with character sheet and quest log', async ({ page }) => {
    await page.goto('/');

    // Check navbar brand
    await expect(page.locator('.brand')).toContainText('Progress Quest');

    // Check character sheet card
    await expect(page.getByText('Character Sheet')).toBeVisible();
    await expect(page.getByText('Equipment')).toBeVisible();

    // Check questing card
    await expect(page.getByText('Questing & Progression')).toBeVisible();

    // Check activity log
    await expect(page.getByText('Activity Log')).toBeVisible();

    // Check inventory card
    await expect(page.getByText('Inventory & Loot')).toBeVisible();
  });

  test('toggles theme between Dark Mode and Retro ProgrOS', async ({ page }) => {
    await page.goto('/');

    const themeBtn = page.getByRole('button', { name: /Retro ProgrOS|Dark Mode/i });
    await expect(themeBtn).toBeVisible();

    // Toggle theme
    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'progros');

    // Toggle back
    await themeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('opens and closes Roster & Save Manager modal', async ({ page }) => {
    await page.goto('/');

    const rosterBtn = page.getByRole('button', { name: /Roster & Saves/i });
    await rosterBtn.click();

    await expect(page.getByText('Character Roster & Save Manager')).toBeVisible();
    await expect(page.getByText('Export Current Save')).toBeVisible();
  });
});
