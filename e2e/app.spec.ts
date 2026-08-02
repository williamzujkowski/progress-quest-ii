import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const loadDenseDashboard = async (page: Page) => {
  // ponytail: seed through Zustand's exported API; a production-only fixture route would add more test machinery.
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/state/gameStore.ts');
    const state = useGameStore.getState();
    useGameStore.setState({
      character: {
        ...state.character,
        Inventory: [
          { name: 'Gold', qty: 0 },
          ...Array.from({ length: 80 }, (_, index) => ({ name: `Loot item ${index + 1}`, qty: index + 1 })),
        ],
      },
      log: Array.from({ length: 50 }, (_, index) => `Event ${50 - index}`),
    });
  });
  await expect(page.locator('.log-entry')).toHaveCount(50);
  await expect(page.getByRole('region', { name: 'Inventory items' }).locator('.equip-item')).toHaveCount(80);
};

test.describe('Progress Quest terminal dashboard', () => {
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

  test('selects and persists an OKLCH terminal theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    const themePicker = page.getByRole('combobox', { name: 'Visual theme' });
    await expect(themePicker).toHaveValue('remarque-dark');
    await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', 'remarque-dark');

    await themePicker.selectOption('remarque-light');
    await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', 'remarque-light');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('progquest_theme_v1'))).toBe('remarque-light');

    await page.reload();
    await expect(themePicker).toHaveValue('remarque-light');
    await themePicker.selectOption('progros');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'progros');
    await expect(page.locator('html')).not.toHaveAttribute('data-terminal-theme', /.+/);
  });

  test('keeps the theme picker keyboard reachable with a visible focus ring', async ({ page }) => {
    await page.goto('/');

    const themePicker = page.getByRole('combobox', { name: 'Visual theme' });
    let reachedThemePicker = false;
    for (let tabIndex = 0; tabIndex < 10; tabIndex += 1) {
      await page.keyboard.press('Tab');
      if (await themePicker.evaluate((element) => element === document.activeElement)) {
        reachedThemePicker = true;
        break;
      }
    }

    expect(reachedThemePicker).toBe(true);
    await expect(themePicker).toHaveCSS('outline-style', 'solid');
  });

  test('keeps a dense desktop dashboard within one viewport and follows latest activity', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await loadDenseDashboard(page);

    const log = page.getByRole('region', { name: 'Activity Event Log' });
    const inventory = page.getByRole('region', { name: 'Inventory items' });
    const character = page.getByRole('region', { name: 'Character Sheet' });
    const metrics = {
      page: await page.evaluate(() => ({ height: document.documentElement.scrollHeight, viewport: window.innerHeight })),
      log: await log.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight, top: element.scrollTop })),
      inventory: await inventory.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight })),
    };

    expect(metrics.page.height).toBeLessThanOrEqual(metrics.page.viewport);
    expect(metrics.log.scroll).toBeGreaterThan(metrics.log.client);
    expect(metrics.log.top + metrics.log.client).toBeGreaterThanOrEqual(metrics.log.scroll - 1);
    expect(metrics.inventory.scroll).toBeGreaterThan(metrics.inventory.client);
    await character.focus();
    await expect(character).toBeFocused();
    await expect(log.locator('.log-entry').last()).toContainText('Event 50');
  });

  for (const width of [320, 375, 768]) {
    test(`bounds growing dashboard feeds at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await loadDenseDashboard(page);

      const log = page.getByRole('region', { name: 'Activity Event Log' });
      const inventory = page.getByRole('region', { name: 'Inventory items' });
      const metrics = {
        page: await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })),
        log: await log.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight, top: element.scrollTop })),
        inventory: await inventory.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight })),
      };

      expect(metrics.page.scroll).toBeLessThanOrEqual(metrics.page.client);
      expect(metrics.log.scroll).toBeGreaterThan(metrics.log.client);
      expect(metrics.log.top + metrics.log.client).toBeGreaterThanOrEqual(metrics.log.scroll - 1);
      expect(metrics.inventory.scroll).toBeGreaterThan(metrics.inventory.client);
      await expect(log.locator('.log-entry').last()).toContainText('Event 50');
    });
  }

  for (const theme of ['remarque-dark', 'remarque-light', 'progros']) {
    test(`${theme} has no detectable WCAG A or AA violations`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('combobox', { name: 'Visual theme' }).selectOption(theme);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }

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

  test('imports a save through the session seam', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Roster & Saves/i }).click();

    const pqw = await page.evaluate(() => {
      const rawRoster = localStorage.getItem('progquest_roster_v1');
      if (!rawRoster) throw new Error('Expected the open save manager to persist the current character.');
      const [savedCharacter] = Object.values(JSON.parse(rawRoster) as Record<string, unknown>);
      return btoa(unescape(encodeURIComponent(JSON.stringify(savedCharacter))));
    });

    await page.getByPlaceholder('Paste base64 .pqw save string here...').fill(pqw);
    await page.getByRole('button', { name: 'Load Character' }).click();

    await expect(page.getByRole('dialog', { name: /Character Roster/i })).not.toBeVisible();
    await expect(page.getByRole('region', { name: 'Activity Event Log' })).toContainText(
      'Loaded character Krg from save data.',
    );
  });

  test('preserves the active session when save import validation fails', async ({ page }) => {
    await page.goto('/');
    const activeName = await page.locator('.hero-name > span:not(.badge)').innerText();
    await page.getByRole('button', { name: /Roster & Saves/i }).click();
    await page.getByPlaceholder('Paste base64 .pqw save string here...').fill('%%%INVALID_BASE64%%%');
    await page.getByRole('button', { name: 'Load Character' }).click();

    await expect(page.getByRole('dialog', { name: /Character Roster/i })).toBeVisible();
    await expect(page.getByText('Malformed base64 save string.')).toBeVisible();
    await expect(page.locator('.hero-name > span:not(.badge)')).toHaveText(activeName);
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
      await expect(page.getByRole('combobox', { name: 'Visual theme' })).toBeInViewport();

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
