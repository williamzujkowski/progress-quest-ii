import { expect, test } from './fixtures/strictConsole';

/**
 * #126: the shell used to paint its static dark fallback until React mounted, so a stored light
 * or alternate palette flashed the wrong background on every cold load — worst on a slow mobile
 * PWA start, which is exactly when it is most visible.
 *
 * These assert the palette is on the document at first paint, before any application script has
 * run. `addInitScript` seeds storage before navigation.
 *
 * The end state cannot show that. `applyTheme` (src/theme.ts) sets `data-theme` and the same inline
 * custom properties, and App.tsx calls it on mount, so anything read after `goto` resolves is
 * satisfied by React alone — this file used to pass in full with the boot script deleted from
 * index.html, which is the regression it exists to catch. What separates the two is *when*, so
 * `appliedAt` records the document's readyState at the first `data-theme` write. The boot script is
 * a classic script in the parsed document and lands while readyState is still 'loading'; React is a
 * deferred module and cannot run until parsing is done.
 */

const STORAGE_KEY = 'progquest_theme_v1';

/**
 * Seeds storage and arms the timing probe, in that order, before any page script runs.
 *
 * The observer watches `document` rather than `documentElement` because an init script can run
 * before the root element exists. Its callback is a microtask, so it drains at the checkpoint
 * straight after the boot script's own execution — still inside parsing.
 */
const seedTheme = (theme: string | null) => `
  try {
    if (${JSON.stringify(theme)} === null) window.localStorage.removeItem(${JSON.stringify(STORAGE_KEY)});
    else window.localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(theme)});
  } catch (error) { /* storage denied; the boot script must cope on its own */ }

  window.__themeAppliedAt = null;
  new MutationObserver(() => {
    if (window.__themeAppliedAt === null) window.__themeAppliedAt = document.readyState;
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-theme'] });
`;

const bootState = async (page: import('@playwright/test').Page) => page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  // Read the inline style specifically: this is what the boot script wrote, not what a
  // stylesheet or React would later supply.
  background: document.documentElement.style.getPropertyValue('--terminal-background'),
  foreground: document.documentElement.style.getPropertyValue('--terminal-foreground'),
  appliedAt: (window as unknown as { __themeAppliedAt: string | null }).__themeAppliedAt,
}));

/** 'loading' is the whole assertion: past it, a deferred module could have been responsible. */
const expectAppliedBeforeParsingEnded = (appliedAt: string | null) => {
  expect(appliedAt, 'the palette was not on the document before parsing finished').toBe('loading');
};

for (const theme of ['remarque-light', 'remarque-dark', 'green-phosphor-crt']) {
  test(`applies the stored ${theme} palette before first paint`, async ({ page }) => {
    await page.addInitScript(seedTheme(theme));
    await page.goto('/');
    const state = await bootState(page);
    expect(state.theme).toBe(theme);
    expect(state.background, 'boot script did not set a background inline').not.toBe('');
    expect(state.foreground, 'boot script did not set a foreground inline').not.toBe('');
    expectAppliedBeforeParsingEnded(state.appliedAt);
  });
}

test('applies the stored progros palette before first paint', async ({ page }) => {
  await page.addInitScript(seedTheme('progros'));
  await page.goto('/');
  // progros is the one theme whose colours live in the stylesheet rather than the theme
  // package, and applyTheme deliberately strips the inline overrides once React mounts so the
  // `[data-theme='progros']` rules can own it. So the durable assertion here is the attribute
  // plus the resulting paint, not the inline properties the boot script set on the way past.
  const progros = await bootState(page);
  expect(progros.theme).toBe('progros');
  expectAppliedBeforeParsingEnded(progros.appliedAt);
  const background = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
});

test('falls back to the system preference when nothing is stored', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(seedTheme(null));
  await page.goto('/');
  const dark = await bootState(page);
  expect(dark.theme).toBe('remarque-dark');
  expectAppliedBeforeParsingEnded(dark.appliedAt);

  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(seedTheme(null));
  await page.goto('/');
  const light = await bootState(page);
  expect(light.theme).toBe('remarque-light');
  expectAppliedBeforeParsingEnded(light.appliedAt);
});

test('ignores a malformed stored value instead of applying it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(seedTheme('../../etc/passwd'));
  await page.goto('/');
  // Fail closed: an unrecognised id must resolve to a real theme, never be written through.
  const malformed = await bootState(page);
  expect(malformed.theme).toBe('remarque-dark');
  expectAppliedBeforeParsingEnded(malformed.appliedAt);
});
