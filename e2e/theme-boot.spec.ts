import { expect, test } from './fixtures/strictConsole';

/**
 * #126: the shell used to paint its static dark fallback until React mounted, so a stored light
 * or alternate palette flashed the wrong background on every cold load — worst on a slow mobile
 * PWA start, which is exactly when it is most visible.
 *
 * These assert the palette is on the document at first paint, before any application script has
 * run. `addInitScript` seeds storage before navigation, and the assertions read the inline
 * custom properties the boot script sets rather than the app's, so a passing result cannot be
 * React having caught up.
 */

const STORAGE_KEY = 'progquest_theme_v1';

const seedTheme = (theme: string | null) => `
  try {
    if (${JSON.stringify(theme)} === null) window.localStorage.removeItem(${JSON.stringify(STORAGE_KEY)});
    else window.localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(theme)});
  } catch (error) { /* storage denied; the boot script must cope on its own */ }
`;

const bootState = async (page: import('@playwright/test').Page) => page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  // Read the inline style specifically: this is what the boot script wrote, not what a
  // stylesheet or React would later supply.
  background: document.documentElement.style.getPropertyValue('--terminal-background'),
  foreground: document.documentElement.style.getPropertyValue('--terminal-foreground'),
}));

for (const theme of ['remarque-light', 'remarque-dark', 'green-phosphor-crt']) {
  test(`applies the stored ${theme} palette before first paint`, async ({ page }) => {
    await page.addInitScript(seedTheme(theme));
    await page.goto('/');
    const state = await bootState(page);
    expect(state.theme).toBe(theme);
    expect(state.background, 'boot script did not set a background inline').not.toBe('');
    expect(state.foreground, 'boot script did not set a foreground inline').not.toBe('');
  });
}

test('applies the stored progros palette before first paint', async ({ page }) => {
  await page.addInitScript(seedTheme('progros'));
  await page.goto('/');
  // progros is the one theme whose colours live in the stylesheet rather than the theme
  // package, and applyTheme deliberately strips the inline overrides once React mounts so the
  // `[data-theme='progros']` rules can own it. So the durable assertion here is the attribute
  // plus the resulting paint, not the inline properties the boot script set on the way past.
  expect((await bootState(page)).theme).toBe('progros');
  const background = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
});

test('falls back to the system preference when nothing is stored', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(seedTheme(null));
  await page.goto('/');
  expect((await bootState(page)).theme).toBe('remarque-dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(seedTheme(null));
  await page.goto('/');
  expect((await bootState(page)).theme).toBe('remarque-light');
});

test('ignores a malformed stored value instead of applying it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(seedTheme('../../etc/passwd'));
  await page.goto('/');
  // Fail closed: an unrecognised id must resolve to a real theme, never be written through.
  expect((await bootState(page)).theme).toBe('remarque-dark');
});
