import { test as base, expect, type Page } from '@playwright/test';

/**
 * Fails a test that leaves an unexpected console error or uncaught page error behind.
 *
 * Most of the suite asserts what it went looking for. An error the page raised on the way there
 * goes unnoticed unless something checks, and a handful of tests attaching their own listeners
 * covers only the paths someone already suspected.
 *
 * Tests that provoke an error deliberately declare what they expect. Declaring is the point: an
 * opt-out that simply silences a test would let a second, unrelated error hide behind the first.
 *
 * Covers the `page` fixture only. A test that builds its own context from `browser` gets a page
 * this never sees, so it must attach `watchForErrors` itself. That is stated here rather than
 * left to be discovered, because a guard with a silent hole is worse than one with a known one.
 */

/**
 * The same check for a page this fixture did not create. Returns the assertion to run at the end
 * of the test, so the caller cannot attach the listeners and forget to check them.
 */
export function watchForErrors(page: Page, expected: RegExp[] = []): () => void {
  const unexpected: string[] = [];
  const record = (message: string) => {
    if (expected.some((pattern) => pattern.test(message))) return;
    unexpected.push(message);
  };
  page.on('pageerror', (error) => record(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') record(`console.error: ${message.text()}`);
  });
  return () => expect(unexpected, 'the page raised errors the test did not expect').toEqual([]);
}

export const test = base.extend<{ expectedPageErrors: RegExp[] }>({
  expectedPageErrors: [[], { option: true }],

  // The second argument is Playwright's `use` callback, named `runTest` here only because the
  // React hooks lint rule reads a bare `use(...)` as a hook call. Renaming is cheaper than a
  // suppression, which would also silence the rule for anything else added to this file.
  page: async ({ page, expectedPageErrors }, runTest) => {
    const unexpected: string[] = [];
    const record = (message: string) => {
      if (expectedPageErrors.some((pattern) => pattern.test(message))) return;
      unexpected.push(message);
    };

    page.on('pageerror', (error) => record(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      record(`console.error: ${message.text()}`);
    });

    await runTest(page);

    expect(unexpected, 'the page raised errors the test did not expect').toEqual([]);
  },
});

export { expect };

/**
 * Waits until the application has mounted before a test reaches into its module graph.
 *
 * Several tests drive state through `page.evaluate(() => import('/src/state/gameStore.ts'))`. That
 * import resolves instantly once the app has loaded the module itself, and slowly when it has
 * not — and a slow one under a loaded machine outlives its evaluate, which Playwright reports as
 * "Resulting promise was garbage collected". It surfaced in CI only after the suite began running
 * workers in parallel, on a test that had passed for months.
 *
 * Waiting for a rendered element is what makes the import a cache hit rather than a fetch.
 */
export async function appReady(page: Page): Promise<void> {
  await expect(page.locator('.hero-banner')).toBeVisible();
}
