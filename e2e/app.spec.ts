import { devices, expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { createNewCharacter } from '../src/engine/sim';
import { returningSessionStorageState } from './fixtures/returningSession';

const returningStorageState = returningSessionStorageState('http://localhost:5173');

const loadDenseDashboard = async (page: Page) => {
  // ponytail: seed through Zustand's exported API; a production-only fixture route would add more test machinery.
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/state/gameStore.ts');
    const state = useGameStore.getState();
    useGameStore.setState({
      character: {
        ...state.character,
        Equip: {
          ...state.character.Equip,
          Weapon: '+100 Threadbare Diamond Sword of Administrative Finality',
          Helm: 'Enchanted Tax Hat of Unscheduled Compliance',
        },
        Inventory: [
          { name: 'Gold', qty: 0 },
          ...Array.from({ length: 80 }, (_, index) => ({ name: `Loot item ${index + 1}`, qty: index + 1 })),
        ],
        Spells: Array.from({ length: 18 }, (_, index) => ({ name: `Procedural Disappointment ${index + 1}`, level: index + 1 })),
      },
      log: Array.from({ length: 50 }, (_, index) => `Event ${50 - index}`),
    });
  });
  await expect(page.locator('.log-entry')).toHaveCount(50);
  await expect(page.getByRole('region', { name: 'Inventory items' }).locator('.equip-item')).toHaveCount(80);
};

test.describe('Progress Quest II terminal dashboard', () => {
  test.use({ storageState: returningStorageState });

  test('requires character creation on a first visit and automatically checkpoints the result', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:5173',
      viewport: { width: 320, height: 900 },
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto('/');

    const creator = page.getByRole('dialog', { name: /New Character/i });
    await expect(creator).toBeVisible();
    await expect(creator).toContainText('No resumable adventurer was found');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations).toEqual([]);
    await expect(creator.getByRole('button', { name: /Close character creator/i })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(creator).toBeVisible();
    await creator.click({ position: { x: 2, y: 2 } });
    await expect(creator).toBeVisible();
    await page.waitForTimeout(1_100);
    expect(await page.evaluate(() => localStorage.getItem('progquest_active_session_v1'))).toBeNull();

    await creator.getByRole('textbox', { name: 'Character Name' }).fill('First Bureaucrat');
    await creator.getByRole('button', { name: /Sold! Start Questing/i }).click();
    await expect(creator).toBeHidden();
    await expect(page.locator('.hero-name > span:not(.badge)')).toHaveText('First Bureaucrat');
    await expect(page.locator('.hero-sub')).toContainText('Prologue');
    await expect(page.locator('.quest-card .badge')).toHaveText('Prologue');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('progquest_active_session_v1'))).not.toBeNull();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('progquest_active_session_v1') ?? '').session.character.Traits.Name)).toBe('First Bureaucrat');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('progquest_active_session_v1') ?? '').session.character.PendingTasks.length)).toBe(5);
    await context.close();
  });

  test('promotes the most recently saved roster character when no active checkpoint exists', async ({ browser }) => {
    const earlier = createNewCharacter('Earlier Roster', 'Half Orc', 'Robot Monk', 706);
    const latest = createNewCharacter('Latest Roster', 'Dung Elf', 'Vermineer', 707);
    const context = await browser.newContext({
      baseURL: 'http://localhost:5173',
      storageState: {
        cookies: [],
        origins: [{
          origin: 'http://localhost:5173',
          localStorage: [{ name: 'progquest_roster_v1', value: JSON.stringify({ 'Earlier Roster': earlier, 'Latest Roster': latest }) }],
        }],
      },
    });
    const page = await context.newPage();
    await page.goto('/');

    await expect(page.getByRole('dialog', { name: /New Character/i })).toHaveCount(0);
    await expect(page.locator('.hero-name > span:not(.badge)')).toHaveText('Latest Roster');
    await expect.poll(() => page.evaluate(() => {
      const raw = localStorage.getItem('progquest_active_session_v1');
      return raw ? JSON.parse(raw).session.character.Traits.Name : null;
    })).toBe('Latest Roster');
    await context.close();
  });

  test('resumes the exact active session before the game clock starts', async ({ page }) => {
    await page.goto('/');
    const expected = await page.evaluate(async () => {
      const [{ useGameStore }, { RandomGenerator }, { captureActiveSession }] = await Promise.all([
        import('/src/state/gameStore.ts'),
        import('/src/engine/prng.ts'),
        import('/src/state/sessionCheckpoint.ts'),
      ]);
      const state = useGameStore.getState();
      const rng = new RandomGenerator('e2e-checkpoint');
      rng.random(999);
      useGameStore.setState({
        character: {
          ...state.character,
          Traits: { ...state.character.Traits, Name: 'Reloaded Bureaucrat' },
          Task: { ...state.character.Task, elapsedMs: 321 },
        },
        rng,
        isPaused: true,
        log: ['Checkpointed indignity', 'Earlier paperwork'],
        progression: { experience: { currentSeconds: 3, maxSeconds: 10 }, completedTasks: 7, elapsedSeconds: 22 },
      });
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
      return captureActiveSession();
    });

    await page.reload({ waitUntil: 'networkidle' });

    const restored = await page.evaluate(async () => {
      const { captureActiveSession } = await import('/src/state/sessionCheckpoint.ts');
      return captureActiveSession();
    });
    expect(restored).toEqual(expected);
    await expect(page.getByText('Reloaded Bureaucrat')).toBeVisible();
  });

  test('recovers the last-known-good session without overwriting corrupt bytes', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/');
    await page.evaluate(async () => {
      const { ACTIVE_CHECKPOINT_KEY, ACTIVE_CHECKPOINT_LKG_KEY, captureActiveSession } = await import('/src/state/sessionCheckpoint.ts');
      localStorage.setItem(ACTIVE_CHECKPOINT_LKG_KEY, JSON.stringify(captureActiveSession()));
      localStorage.setItem(ACTIVE_CHECKPOINT_KEY, '{unreadable');
    });

    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.getByRole('alert')).toContainText('Recovered the last known good session');
    await page.waitForTimeout(1_100);
    expect(await page.evaluate(() => localStorage.getItem('progquest_active_session_v1'))).toBe('{unreadable');
    await page.getByRole('button', { name: 'Replace unreadable checkpoint' }).click();
    await expect(page.getByRole('status')).toContainText('Automatic checkpoints resumed');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('progquest_active_session_v1') ?? '').schemaVersion)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('reports denied checkpoint storage without preventing play', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('Denied', 'SecurityError'); } });
    });

    await page.goto('/');

    await expect(page.getByRole('alert')).toContainText('Browser storage is unavailable. Automatic checkpoints are paused.');
    await expect(page.getByRole('heading', { level: 1, name: 'Progress Quest II' })).toBeVisible();
  });

  test('recovers accessibly from an unexpected root render failure', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('progquest_roster_v1', '{"Krg":{"still":"saved"}}');
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: () => { throw new Error('deliberate render failure with private details'); },
      });
    });
    await page.goto('/');

    const heading = page.getByRole('heading', { name: /quest process encountered an enthusiasm/i });
    await expect(heading).toBeFocused();
    await expect(page.getByText(/saved characters were not deleted/i)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('progquest_roster_v1'))).toBe('{"Krg":{"still":"saved"}}');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Retry interface' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Reload page' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Download current save' })).toBeFocused();
    const saveDownload = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    const savedFile = await saveDownload;
    expect(savedFile.suggestedFilename()).toBe('progquest-current.pqw');
    const savedPath = await savedFile.path();
    expect(savedPath).not.toBeNull();
    expect(Buffer.from(await readFile(savedPath!, 'utf8'), 'base64').toString('utf8')).toContain('"Traits"');

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Download diagnostics' })).toBeFocused();
    const diagnosticDownload = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    const diagnosticFile = await diagnosticDownload;
    expect(diagnosticFile.suggestedFilename()).toBe('progquest-diagnostics.json');
    const diagnosticPath = await diagnosticFile.path();
    expect(diagnosticPath).not.toBeNull();
    const diagnosticReport = JSON.parse(await readFile(diagnosticPath!, 'utf8')) as { events: Array<{ code: string }> };
    expect(diagnosticReport.events.some((event) => event.code === 'react_caught')).toBe(true);
    await expect(page.getByRole('status')).toHaveText(/nothing was uploaded/i);

    for (const theme of ['remarque-dark', 'remarque-light', 'progros'] as const) {
      await page.evaluate(async (themeId) => {
        const { applyTheme } = await import('/src/theme.ts');
        applyTheme(document.documentElement, themeId);
      }, theme);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    }
  });

  test('captures an unhandled rejection without exporting its private message', async ({ page }) => {
    await page.goto('/');
    const report = await page.evaluate(async () => {
      const { diagnostics } = await import('/src/state/diagnostics.ts');
      const rejection = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('Krg token=secret /home/william/save.pqw?auth=yes'),
      });
      window.dispatchEvent(rejection);
      return diagnostics.exportReport();
    });

    expect(report).toContain('unhandled_rejection');
    expect(report).not.toMatch(/Krg|secret|william|save\.pqw|auth=/i);
  });

  test('contains rejected audio startup and reports an accessible unavailable state', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      class RejectedAudioContext {
        public readonly state = 'suspended';
        public readonly currentTime = 0;
        public readonly destination = {};
        private resumeAttempts = 0;

        public resume(): Promise<void> {
          this.resumeAttempts += 1;
          return this.resumeAttempts === 1
            ? Promise.reject(new DOMException('Activation denied', 'NotAllowedError'))
            : Promise.resolve();
        }

        public createOscillator() {
          return { connect() {}, start() {}, stop() {} };
        }

        public createGain() {
          return { gain: { setValueAtTime() {} }, connect() {} };
        }
      }
      Object.defineProperty(window, 'AudioContext', { configurable: true, value: RejectedAudioContext });
    });
    await page.goto('/');
    const initialCharacter = await page.evaluate(async () => {
      const { useGameStore } = await import('/src/state/gameStore.ts');
      return useGameStore.getState().character.Traits.Name;
    });

    await page.getByRole('button', { name: 'Audio' }).click();
    await page.getByRole('button', { name: 'Muted' }).click();

    await expect(page.getByRole('button', { name: 'Retry audio' })).toBeVisible();
    await expect(page.locator('.audio-status')).toHaveText(
      'Sound effects are unavailable. Questing will continue in dignified silence.',
    );
    const recovery = await page.evaluate(async () => {
      const [{ diagnostics }, { useGameStore }] = await Promise.all([
        import('/src/state/diagnostics.ts'),
        import('/src/state/gameStore.ts'),
      ]);
      const before = useGameStore.getState();
      before.tick(1);
      const after = useGameStore.getState();
      return {
        diagnosticCodes: diagnostics.snapshot().map((event) => event.code),
        name: after.character.Traits.Name,
        progressed: after.progression.completedTasks > before.progression.completedTasks
          || after.character.Task.elapsedMs > before.character.Task.elapsedMs,
      };
    });
    expect(recovery.diagnosticCodes).toContain('audio_resume_failed');
    expect(recovery.name).toBe(initialCharacter);
    expect(recovery.progressed).toBe(true);

    await page.getByRole('button', { name: 'Retry audio' }).click();
    await expect(page.getByRole('button', { name: 'Audio' })).toBeVisible();
    await expect(page.locator('.audio-status')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('saves explicitly and recovers from clipboard denial without a write storm', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/');
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      const trackedWindow = window as Window & { __rosterWrites?: number };
      trackedWindow.__rosterWrites = 0;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'progquest_roster_v1') trackedWindow.__rosterWrites = (trackedWindow.__rosterWrites ?? 0) + 1;
        return original.call(this, key, value);
      };
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
      });
    });

    await page.getByRole('button', { name: /Roster & Saves/i }).click();
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => (window as Window & { __rosterWrites?: number }).__rosterWrites)).toBe(0);
    const fallback = page.getByRole('textbox', { name: 'Current save text' });
    await expect(fallback).toHaveAttribute('readonly', '');
    await fallback.focus();
    await expect(fallback).toBeFocused();
    await fallback.selectText();
    expect(await fallback.evaluate((element) => {
      const textarea = element as HTMLTextAreaElement;
      return textarea.selectionStart === 0 && textarea.selectionEnd === textarea.value.length;
    })).toBe(true);

    await page.getByRole('button', { name: 'Save current character' }).click();
    await expect(page.getByRole('status')).toContainText('Character saved');
    expect(await page.evaluate(() => (window as Window & { __rosterWrites?: number }).__rosterWrites)).toBe(1);

    await page.getByRole('button', { name: 'Copy Base64 .pqw Save String' }).click();
    await expect(page.getByRole('alert')).toContainText('copy it manually');
    expect(pageErrors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('renders full game interface with Hero Banner, loadout, quest log, and spell book', async ({ page }) => {
    await page.goto('/');

    // Check navbar brand
    await expect(page).toHaveTitle('Progress Quest II — The Sequel Nobody Had to Play');
    await expect(page.getByRole('heading', { level: 1, name: 'Progress Quest II' })).toBeVisible();
    await expect(page.getByText('The sequel nobody had to play.')).toBeVisible();

    // Check Hero Banner
    await expect(page.getByRole('region', { name: /Hero Overview Banner/i })).toBeVisible();

    // Prime stats belong to the compact hero banner; the left card is the loadout.
    const hero = page.getByRole('region', { name: /Hero Overview Banner/i });
    await expect(hero.getByTestId('hero-prime-stats')).toBeVisible();
    await expect(hero.locator('[data-testid="hero-prime-stats"] strong')).toHaveCount(6);
    await expect(page.getByText('Character Loadout')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Character Loadout' })).not.toContainText('Prime Stats');
    await expect(page.getByText(/Spell Book/i)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Equipment List' }).locator('.tooltip-trigger')).toHaveCount(11);
    await expect(page.locator('.inventory-card .card-header .tooltip-trigger')).toBeVisible();
    await page.locator('.tooltip-trigger').first().focus();
    await expect(page.getByRole('tooltip')).toBeVisible();
    expect(await page.getByRole('tooltip').evaluate((element) => element.parentElement === document.body)).toBe(true);

    // Check questing card
    await expect(page.getByText('Questing & Progression')).toBeVisible();

    // Check activity log
    await expect(page.getByText('Activity Log')).toBeVisible();

    // Check inventory card
    await expect(page.getByText('Inventory & Loot')).toBeVisible();
  });

  test('shows mechanics and flavor for equipment, loot, and spells', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { useGameStore } = await import('/src/state/gameStore.ts');
      const state = useGameStore.getState();
      useGameStore.setState({
        character: {
          ...state.character,
          Equip: { ...state.character.Equip, Weapon: 'Venomed Shortsword' },
          Inventory: [{ name: 'Gold', qty: 0 }, { name: 'Golden Orb of Fortune', qty: 3 }],
          Gold: 42,
          Spells: [{ name: 'Rabbit Punch', level: 2 }],
        },
      });
    });

    const weapon = page.locator('.tooltip-trigger', { hasText: 'Venomed Shortsword' });
    await weapon.focus();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toContainText('Generation quality: 9 (Shortsword 5 + Venomed +4)');
    await expect(tooltip).toContainText('Combat contribution: none');
    expect(await tooltip.evaluate((element) => element.parentElement === document.body)).toBe(true);
    const tooltipBox = await tooltip.boundingBox();
    expect(tooltipBox).not.toBeNull();
    expect(tooltipBox?.x).toBeGreaterThanOrEqual(0);
    expect(tooltipBox?.y).toBeGreaterThanOrEqual(0);
    expect(tooltipBox?.x + (tooltipBox?.width ?? 0)).toBeLessThanOrEqual(1280);
    await page.locator('.tooltip-trigger', { hasText: 'Golden Orb of Fortune' }).focus();
    await expect(page.getByRole('tooltip')).toContainText('Encumbrance: +3 cubits');
    await page.locator('.tooltip-trigger', { hasText: 'Rabbit Punch' }).focus();
    await expect(page.getByRole('tooltip')).toContainText('Spell rank: 2');
    await page.locator('.inventory-card').getByRole('button', { name: '42 GP' }).focus();
    await expect(page.getByRole('tooltip')).toContainText('Encumbrance: +0 cubits');
  });

  test('keeps a tooltip open under the pointer and dismisses it with Escape', async ({ page }) => {
    await page.goto('/');

    const trigger = page.locator('.tooltip-trigger').first();
    await trigger.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await tooltip.hover();
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    await trigger.focus();
    await expect(tooltip).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-describedby', await tooltip.getAttribute('id') ?? 'missing-tooltip-id');
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('toggles a tooltip by touch inside a narrow viewport', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['iPhone 13'], baseURL: 'http://localhost:5173', storageState: returningStorageState });
    const page = await context.newPage();
    await page.goto('/');

    const trigger = page.locator('.tooltip-trigger').first();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    const box = await tooltip.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box?.x + (box?.width ?? 0)).toBeLessThanOrEqual(390);
    await page.getByRole('heading', { name: 'Progress Quest II' }).tap();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(tooltip).toBeHidden();
    await trigger.tap();
    await expect(tooltip).toBeVisible();
    await trigger.tap();
    await expect(tooltip).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await page.evaluate(async () => {
      const { useGameStore } = await import('/src/state/gameStore.ts');
      const state = useGameStore.getState();
      useGameStore.setState({
        isPaused: true,
        character: {
          ...state.character,
          Inventory: [
            { name: 'Gold', qty: 0 },
            ...Array.from({ length: 79 }, (_, index) => ({ name: `Loot item ${index + 1}`, qty: 1 })),
            { name: 'X'.repeat(200), qty: 1 },
          ],
        },
      });
    });
    const lastItem = page.locator('.inventory-list .tooltip-trigger').last();
    await lastItem.scrollIntoViewIfNeeded();
    await lastItem.tap();
    const longTooltip = page.getByRole('tooltip');
    const longBox = await longTooltip.boundingBox();
    expect(longBox).not.toBeNull();
    expect(longBox?.y).toBeGreaterThanOrEqual(0);
    expect(longBox?.y + (longBox?.height ?? 0)).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    await context.close();
  });

  test('selects and persists an OKLCH terminal theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    const themePicker = page.getByRole('combobox', { name: 'Visual theme' });
    await expect(themePicker).toHaveValue('remarque-dark');
    await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', 'remarque-dark');

    await themePicker.selectOption('remarque-light');
    await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', 'remarque-light');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f8f6f3');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('progquest_theme_v1'))).toBe('remarque-light');

    await page.reload();
    await expect(themePicker).toHaveValue('remarque-light');
    await themePicker.selectOption('progros');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'progros');
    await expect(page.locator('html')).not.toHaveAttribute('data-terminal-theme', /.+/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', 'oklch(0.55 0.12 185)');
  });

  test('keeps the selected theme usable when preference storage rejects the write', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 320, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'progquest_theme_v1') throw new DOMException('Quota exceeded', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });

    await page.getByRole('combobox', { name: 'Visual theme' }).selectOption('remarque-light');

    await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', 'remarque-light');
    await expect(page.getByRole('status')).toHaveText('Theme changed, but this browser could not remember it.');
    const diagnosticCodes = await page.evaluate(async () => {
      const { diagnostics } = await import('/src/state/diagnostics.ts');
      return diagnostics.snapshot().map((event) => event.code);
    });
    expect(diagnosticCodes).toContain('theme_write_failed');
    expect(pageErrors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('uses the system theme accessibly when preference storage rejects the read', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => {
      localStorage.setItem('progquest_theme_v1', 'progros');
      const originalGet = Storage.prototype.getItem;
      const originalSet = Storage.prototype.setItem;
      const trackedWindow = window as Window & { __themeWrites?: number };
      trackedWindow.__themeWrites = 0;
      Storage.prototype.getItem = function(key) {
        if (key === 'progquest_theme_v1') throw new DOMException('Access denied', 'SecurityError');
        return originalGet.call(this, key);
      };
      Storage.prototype.setItem = function(key, value) {
        if (key === 'progquest_theme_v1') {
          trackedWindow.__themeWrites = (trackedWindow.__themeWrites ?? 0) + 1;
          throw new DOMException('Access denied', 'SecurityError');
        }
        return originalSet.call(this, key, value);
      };
    });
    await page.goto('/');

    await expect(page.getByRole('combobox', { name: 'Visual theme' })).toHaveValue('remarque-dark');
    await expect(page.getByRole('status')).toHaveText('Theme preference unavailable; using your system default.');
    const diagnosticCodes = await page.evaluate(async () => {
      const { diagnostics } = await import('/src/state/diagnostics.ts');
      return diagnostics.snapshot().map((event) => event.code);
    });
    expect(diagnosticCodes).toContain('theme_read_failed');
    expect(await page.evaluate(() => (window as Window & { __themeWrites?: number }).__themeWrites)).toBe(0);
    expect(pageErrors).toEqual([]);
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

  test('labels activity events without substring false positives', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const { useGameStore } = await import('/src/state/gameStore.ts');
      useGameStore.setState({
        log: [
          'Activity 50',
          'Resting at the inn.',
          'Welcome to Progress Quest II! Krg sets out on an adventure.',
          'Act 2 Unlocked!',
          'LEVEL UP! Advanced to level 2!',
          'Quest completed: Find the lost stapler',
          'Defeated monster and looted a bent fork.',
          'Sold loot at market for 10 gold!',
          'Executing a passing pigeon...',
        ],
      });
    });

    const log = page.getByRole('region', { name: 'Activity Event Log' });
    const tagFor = (message: string) => log.locator('.log-entry', { hasText: message }).locator('.log-tag');
    await expect(tagFor('Activity 50')).toHaveCount(0);
    await expect(tagFor('Resting at the inn.')).toHaveCount(0);
    await expect(tagFor('Welcome to Progress Quest II! Krg sets out on an adventure.')).toHaveCount(0);
    await expect(tagFor('Act 2 Unlocked!')).toHaveText('Level');
    await expect(tagFor('LEVEL UP! Advanced to level 2!')).toHaveText('Level');
    await expect(tagFor('Quest completed: Find the lost stapler')).toHaveText('Quest');
    await expect(tagFor('Defeated monster and looted a bent fork.')).toHaveText('Loot');
    await expect(tagFor('Sold loot at market for 10 gold!')).toHaveText('Market');
    await expect(tagFor('Executing a passing pigeon...')).toHaveText('Combat');
  });

  test('fills the desktop middle column with a sparse activity log', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const middleColumn = await page.locator('.quest-column').boundingBox();
    const activityCard = await page.locator('.activity-card').boundingBox();
    expect(middleColumn).not.toBeNull();
    expect(activityCard).not.toBeNull();
    expect(activityCard!.y + activityCard!.height).toBeGreaterThanOrEqual(middleColumn!.y + middleColumn!.height - 1);
  });

  test('keeps a dense desktop dashboard within one viewport and follows latest activity', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await loadDenseDashboard(page);

    const log = page.getByRole('region', { name: 'Activity Event Log' });
    const inventory = page.getByRole('region', { name: 'Inventory items' });
    const character = page.getByRole('region', { name: 'Character Loadout' });
    const equipment = page.getByRole('region', { name: 'Equipment List' });
    const spellBook = page.getByRole('region', { name: 'Spell Book' });
    const metrics = {
      page: await page.evaluate(() => ({ height: document.documentElement.scrollHeight, viewport: window.innerHeight })),
      log: await log.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight, top: element.scrollTop })),
      inventory: await inventory.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight })),
      character: await character.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight })),
      spells: await spellBook.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight })),
    };

    expect(metrics.page.height).toBeLessThanOrEqual(metrics.page.viewport);
    const middleColumn = await page.locator('.quest-column').boundingBox();
    const activityCard = await page.locator('.activity-card').boundingBox();
    expect(middleColumn).not.toBeNull();
    expect(activityCard).not.toBeNull();
    expect(activityCard!.y + activityCard!.height).toBeGreaterThanOrEqual(middleColumn!.y + middleColumn!.height - 1);
    expect(metrics.log.scroll).toBeGreaterThan(metrics.log.client);
    expect(metrics.log.top + metrics.log.client).toBeGreaterThanOrEqual(metrics.log.scroll - 1);
    expect(metrics.inventory.scroll).toBeGreaterThan(metrics.inventory.client);
    expect(metrics.character.scroll).toBeLessThanOrEqual(metrics.character.client);
    expect(metrics.spells.scroll).toBeGreaterThan(metrics.spells.client);
    await expect(equipment).toHaveCSS('grid-template-columns', /\S+\s+\S+/);
    await expect(page.getByText('Spell Book (18)')).toBeInViewport();
    await character.focus();
    await expect(character).toBeFocused();
    await expect(log.locator('.log-entry').last()).toContainText('Event 50');
  });

  test('compacts absurd progression values without overflowing mobile or desktop', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/');
    await page.evaluate(async () => {
      const { useGameStore } = await import('/src/state/gameStore.ts');
      const { character } = useGameStore.getState();
      useGameStore.setState({
        isPaused: true,
        character: {
          ...character,
          Traits: { ...character.Traits, Level: 1_000_000 },
          Stats: Object.fromEntries(Object.keys(character.Stats).map((stat) => [stat, 999_999.999_999_999_9])) as typeof character.Stats,
          Gold: 1_000_000_000_000,
          Plot: { act: 1_000_000_000, currentProgress: 500_000_000, maxProgress: 1_000_000_000 },
          Quest: { ...character.Quest, currentProgress: 1_000_000, maxProgress: 2_000_000 },
          Inventory: [{ name: 'Gold', qty: 0 }, { name: 'rat tail', qty: 1_000_000_000 }],
          Spells: [{ name: 'Infinite Confusion', level: 1_000_000_000 }],
        },
      });
    });

    await expect(page.locator('.hero-name .badge [aria-hidden="true"]')).toHaveText('1.00e6');
    await expect(page.locator('.hero-name .badge .sr-only')).toHaveText('1 million');
    await expect(page.locator('.hero-prime-stats .hero-stat span[aria-hidden="true"]')).toHaveText(Array(6).fill('1.00e6'));
    await expect(page.locator('.hero-sub [aria-hidden="true"]')).toHaveText('1.00e9');
    await expect(page.locator('.gold-pill span[aria-hidden="true"]')).toHaveText('1.00e12');
    await expect(page.locator('.inventory-list .equip-item span[aria-hidden="true"]')).toHaveText('1.00e9');
    await page.getByRole('button', { name: 'rat tail' }).hover();
    await expect(page.getByRole('tooltip')).toContainText('Quantity: 1.00e9');

    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        statTilesFit: [...document.querySelectorAll<HTMLElement>('.hero-stat')]
          .every((tile) => tile.scrollWidth <= tile.clientWidth),
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
      expect(dimensions.statTilesFit).toBe(true);
    }
  });

  test('contains the loadout at the one-screen desktop breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 1025, height: 760 });
    await page.goto('/');
    await loadDenseDashboard(page);

    const character = page.getByRole('region', { name: 'Character Loadout' });
    const spellBook = page.getByRole('region', { name: 'Spell Book' });
    const characterBox = await character.boundingBox();
    const spellBox = await spellBook.boundingBox();

    expect(await character.evaluate((element) => element.scrollHeight)).toBeLessThanOrEqual(await character.evaluate((element) => element.clientHeight));
    expect(spellBox).not.toBeNull();
    expect(spellBox!.height).toBeGreaterThan(0);
    expect(spellBox!.y + spellBox!.height).toBeLessThanOrEqual(characterBox!.y + characterBox!.height);
  });

  test('keeps the compact equipment grid on wide, short screens', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto('/');
    await loadDenseDashboard(page);

    await expect(page.getByRole('region', { name: 'Equipment List' })).toHaveCSS('grid-template-columns', /\S+\s+\S+/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
  });

  for (const width of [320, 375, 768]) {
    test(`bounds growing dashboard feeds at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await loadDenseDashboard(page);

      const log = page.getByRole('region', { name: 'Activity Event Log' });
      const inventory = page.getByRole('region', { name: 'Inventory items' });
      const spellBook = page.getByRole('region', { name: 'Spell Book' });
      const metrics = {
        page: await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })),
        log: await log.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight, top: element.scrollTop })),
        inventory: await inventory.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight })),
        spells: await spellBook.evaluate((element) => ({ client: element.clientHeight, scroll: element.scrollHeight })),
      };

      expect(metrics.page.scroll).toBeLessThanOrEqual(metrics.page.client);
      expect(metrics.log.scroll).toBeGreaterThan(metrics.log.client);
      expect(metrics.log.top + metrics.log.client).toBeGreaterThanOrEqual(metrics.log.scroll - 1);
      expect(metrics.inventory.scroll).toBeGreaterThan(metrics.inventory.client);
      expect(metrics.spells.scroll).toBeGreaterThan(metrics.spells.client);
      await expect(page.getByRole('region', { name: 'Equipment List' })).toHaveCSS('grid-template-columns', /^[^ ]+$/);
      await expect(log.locator('.log-entry').last()).toContainText('Event 50');
    });
  }

  for (const theme of ['remarque-dark', 'remarque-light', 'green-phosphor-crt', 'keys-ocean-sunset-hc', 'progros']) {
    test(`${theme} has no detectable WCAG A or AA violations`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('combobox', { name: 'Visual theme' }).selectOption(theme);
      await page.locator('.tooltip-trigger').first().focus();
      await expect(page.getByRole('tooltip')).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }

  test('honors reduced motion and remains usable in forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/');

    await expect(page.getByRole('combobox', { name: 'Visual theme' })).toBeVisible();
    expect(await page.locator('.progress-bar-fill').first().evaluate((element) => parseFloat(getComputedStyle(element).animationDuration))).toBeLessThan(0.001);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('opens and rolls stats in Character Creator modal', async ({ page }) => {
    await page.goto('/');

    const newCharBtn = page.getByRole('button', { name: /New Character/i });
    await newCharBtn.click();

    await expect(page.getByText('Progress Quest II — New Character')).toBeVisible();
    await expect(page.getByText(/Prime Stats \(3d6 Rolls\)/i)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Character Name' })).toHaveAttribute('maxlength', '120');
    await expect(page.getByRole('group', { name: 'Select Race' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Select Class' })).toBeVisible();

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

    await expect(page.getByText('Progress Quest II — New Character')).not.toBeVisible();
    await expect(page.locator('[data-testid="hero-prime-stats"] strong')).toHaveText(acceptedStats);
  });

  test('contains modal focus, closes with Escape, and restores the trigger', async ({ page }) => {
    await page.goto('/');

    const trigger = page.getByRole('button', { name: /New Character/i });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: /New Character/i });
    const close = dialog.getByRole('button', { name: /Close character creator/i });

    await expect(close).toBeFocused();
    expect((await close.boundingBox())?.width).toBeGreaterThanOrEqual(44);
    expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true);
    await page.keyboard.press('Shift+Tab');
    await expect(trigger).not.toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('contains Save Manager focus and restores its trigger', async ({ page }) => {
    await page.goto('/');

    const trigger = page.getByRole('button', { name: /Roster & Saves/i });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: /Character Roster/i });
    const close = dialog.getByRole('button', { name: 'Close modal' });

    await expect(close).toBeFocused();
    expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(true);
    await page.keyboard.press('Shift+Tab');
    await expect(trigger).not.toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
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
    await page.getByRole('button', { name: 'Save current character' }).click();
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
    await page.getByRole('button', { name: 'Save current character' }).click();

    const pqw = await page.evaluate(() => {
      const rawRoster = localStorage.getItem('progquest_roster_v1');
      if (!rawRoster) throw new Error('Expected the open save manager to persist the current character.');
      const [savedCharacter] = Object.values(JSON.parse(rawRoster) as Record<string, unknown>);
      return btoa(unescape(encodeURIComponent(JSON.stringify(savedCharacter))));
    });

    await page.getByRole('textbox', { name: 'Import Save String (.pqw)' }).fill(pqw);
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
    await page.getByRole('textbox', { name: 'Import Save String (.pqw)' }).fill('%%%INVALID_BASE64%%%');
    await page.getByRole('button', { name: 'Load Character' }).click();

    await expect(page.getByRole('dialog', { name: /Character Roster/i })).toBeVisible();
    await expect(page.getByText('Malformed base64 save string.')).toBeVisible();
    await expect(page.locator('.hero-name > span:not(.badge)')).toHaveText(activeName);
  });

  test('rejects impossible imported progress without exposing NaN progress bars', async ({ page }) => {
    await page.goto('/');
    const activeName = await page.locator('.hero-name > span:not(.badge)').innerText();
    const invalidPqw = await page.evaluate(async () => {
      const { useGameStore } = await import('/src/state/gameStore.ts');
      const { encodePQWSave } = await import('/src/state/saveManager.ts');
      const character = useGameStore.getState().character;
      return encodePQWSave({
        ...character,
        Quest: { ...character.Quest, currentProgress: 1, maxProgress: 0 },
      });
    });

    await page.getByRole('button', { name: /Roster & Saves/i }).click();
    await page.getByRole('textbox', { name: 'Import Save String (.pqw)' }).fill(invalidPqw);
    await page.getByRole('button', { name: 'Load Character' }).click();

    await expect(page.getByRole('dialog', { name: /Character Roster/i })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Invalid Character Sheet Schema');
    await expect(page.locator('.hero-name > span:not(.badge)')).toHaveText(activeName);
    for (const value of await page.getByRole('progressbar').evaluateAll((bars) => bars.map((bar) => bar.getAttribute('aria-valuenow')))) {
      expect(value).toMatch(/^\d+$/);
    }
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
