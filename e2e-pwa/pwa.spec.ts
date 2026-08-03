import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('publishes the Progress Quest II install contract at its Pages scope', async ({ page }) => {
  await page.goto('./');

  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', './favicon.svg');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest');
  const manifest = await page.evaluate(async () => {
    const response = await fetch('./manifest.webmanifest');
    return response.json() as Promise<Record<string, unknown>>;
  });

  expect(manifest).toMatchObject({
    name: 'Progress Quest II',
    short_name: 'ProgQuest II',
    start_url: './',
    scope: './',
    display: 'standalone',
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: './icon-192.png', sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ src: './icon-512.png', sizes: '512x512', type: 'image/png' }),
  ]));
  const iconDimensions = await page.evaluate(async () => Promise.all(['./icon-192.png', './icon-512.png'].map((src) => new Promise<string>((resolve, reject) => {
    const icon = new Image();
    icon.onload = () => resolve(`${icon.naturalWidth}x${icon.naturalHeight}`);
    icon.onerror = reject;
    icon.src = src;
  }))));
  expect(iconDimensions).toEqual(['192x192', '512x512']);

  const workerSource = await page.evaluate(async () => (await fetch('./sw.js')).text());
  expect(workerSource).not.toMatch(/CACHE_PREFIX\}development/);
});

test('loads the Pages-scoped app offline after one successful visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();

  expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toMatch(/\/progress-quest-ii\/sw\.js$/);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1, name: 'Progress Quest II' })).toBeVisible();
  await expect(page.getByText('The sequel nobody had to play.')).toBeVisible();
});

test('keeps questing when service-worker registration fails', async ({ page, request }) => {
  await request.post('./__test__/worker-mode/missing');
  try {
    await page.goto('./');

    await expect(page.getByRole('status')).toHaveText('Offline mode is unavailable. Questing may require civilization.');
    await expect(page.getByRole('heading', { level: 1, name: 'Progress Quest II' })).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(1);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  } finally {
    await request.post('./__test__/worker-mode/normal');
  }
});

test('applies an update only after the user approves it and removes the stale cache', async ({ page, request }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const initialCaches = await page.evaluate(() => caches.keys());
  expect(initialCaches).toHaveLength(1);
  expect(initialCaches[0]).toMatch(/^progress-quest-ii-shell-/);

  await request.post('./__test__/worker-mode/update');
  try {
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration('./'))?.update());
    const updateButton = page.getByRole('button', { name: 'Update now' });
    await expect(updateButton).toBeVisible();
    expect(await page.evaluate(() => caches.keys())).toEqual([
      ...initialCaches,
      'progress-quest-ii-shell-pwa-test-update',
    ]);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await updateButton.focus();
    await Promise.all([page.waitForEvent('load'), page.keyboard.press('Enter')]);
    await expect(page.getByRole('heading', { level: 1, name: 'Progress Quest II' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(['progress-quest-ii-shell-pwa-test-update']);
  } finally {
    await request.post('./__test__/worker-mode/normal');
  }
});

test('keeps the previous offline shell when an update fails atomically', async ({ page, context, request }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const initialCaches = await page.evaluate(() => caches.keys());

  await request.post('./__test__/worker-mode/broken');
  try {
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration('./');
      await registration?.update();
      const worker = registration?.installing;
      if (!worker || worker.state === 'redundant') return;
      await new Promise<void>((resolve) => worker.addEventListener('statechange', () => {
        if (worker.state === 'redundant') resolve();
      }));
    });

    await expect(page.getByRole('button', { name: 'Update now' })).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveText('The update declined its promotion. The current edition remains in office.');
    expect(await page.evaluate(() => caches.keys())).toEqual(initialCaches);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Progress Quest II' })).toBeVisible();
  } finally {
    await context.setOffline(false);
    await request.post('./__test__/worker-mode/normal');
  }
});

test('never runtime-caches query or user-derived data', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(async () => {
    localStorage.setItem('progquest_roster_v1', 'PRIVATE-ROSTER-MARKER');
    await fetch('./manifest.webmanifest?roster=PRIVATE-ROSTER-MARKER');
  });

  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    return (await Promise.all(names.map(async (name) => (await caches.open(name)).keys()))).flat().map((request) => request.url);
  });
  expect(cachedUrls.some((url) => url.includes('?') || url.includes('PRIVATE-ROSTER-MARKER'))).toBe(false);
});
