import { expect, test } from '@playwright/test';

test.describe('Progress Quest Web Application Anthropic UI & Grid Layout', () => {
  test('renders full game interface with Hero Banner, character sheet, quest log, and spell book', async ({ page }) => {
    await page.goto('/');

    // Check navbar brand
    await expect(page.locator('.brand')).toContainText('Progress Quest');
    await expect(page.getByRole('heading', { level: 1, name: 'Progress Quest' })).toBeVisible();

    // Check Hero Banner
    await expect(page.getByRole('region', { name: /Hero Overview Banner/i })).toBeVisible();

    // Check character sheet card & spell book
    await expect(page.getByText('Character Sheet')).toBeVisible();
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

    const acceptedStats = await page.locator('[data-testid="creator-prime-stats"] strong').allTextContents();
    expect(acceptedStats).toHaveLength(6);

    // Click Random Name
    const randomBtn = page.getByRole('button', { name: /Random/i });
    await randomBtn.click();

    // Submit new character
    const submitBtn = page.getByRole('button', { name: /Sold! Start Questing/i });
    await submitBtn.click();

    await expect(page.getByText('Progress Quest - New Character')).not.toBeVisible();
    await expect(page.locator('[data-testid="character-prime-stats"] strong')).toHaveText(acceptedStats);
  });

  test('keeps character creation in the dedicated creator', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /Roster & Saves/i }).click();

    await expect(page.getByRole('dialog', { name: /Character Roster/i })).toBeVisible();
    await expect(page.getByText('Roll New Guy')).toHaveCount(0);
  });

  test('loads a roster character through a fresh game session', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    await page.getByRole('button', { name: /Roster & Saves/i }).click();
    await page.getByRole('button', { name: 'Play' }).click();

    await expect(page.getByRole('dialog', { name: /Character Roster/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Activity Event Log' })).toContainText(
      'Loaded character Krg from roster.',
    );
  });

  for (const width of [320, 375, 768]) {
    test(`keeps the full interface inside a ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
      await expect(page.getByRole('button', { name: /Roster & Saves/i })).toBeInViewport();
      await expect(page.getByRole('button', { name: /Retro ProgrOS/i })).toBeInViewport();

      if (width === 320) {
        await page.getByRole('button', { name: /New Character/i }).click();
        const dialog = page.getByRole('dialog', { name: /New Character/i });
        await expect(dialog).toBeInViewport();
        const dialogDimensions = await dialog.evaluate((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));
        expect(dialogDimensions.scrollWidth).toBeLessThanOrEqual(dialogDimensions.clientWidth);
      }
    });
  }
});
