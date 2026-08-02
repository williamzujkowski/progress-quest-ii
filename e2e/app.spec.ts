import { expect, test } from '@playwright/test';

test.describe('Progress Quest Web Application UI & Baseline Mechanics', () => {
  test('renders full game interface with character sheet, quest log, and spell book', async ({ page }) => {
    await page.goto('/');

    // Check navbar brand
    await expect(page.locator('.brand')).toContainText('Progress Quest');

    // Check character sheet card & spell book
    await expect(page.getByText('Character Sheet')).toBeVisible();
    await expect(page.getByText('Equipment')).toBeVisible();
    await expect(page.getByText(/Spell Book/i)).toBeVisible();

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

  test('opens and rolls stats in Character Creator modal', async ({ page }) => {
    await page.goto('/');

    const newCharBtn = page.getByRole('button', { name: /New Character/i });
    await newCharBtn.click();

    await expect(page.getByText('Progress Quest - New Character')).toBeVisible();
    await expect(page.getByText(/Prime Stats \(3d6 Rolls\)/i)).toBeVisible();

    // Click Roll 'Em
    const rollBtn = page.getByRole('button', { name: /Roll 'Em/i });
    await rollBtn.click();

    // Click Random Name
    const randomBtn = page.getByRole('button', { name: /Random/i });
    await randomBtn.click();

    // Submit new character
    const submitBtn = page.getByRole('button', { name: /Sold! Start Questing/i });
    await submitBtn.click();

    await expect(page.getByText('Progress Quest - New Character')).not.toBeVisible();
  });
});
