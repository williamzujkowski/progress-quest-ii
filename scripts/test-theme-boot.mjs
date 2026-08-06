import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildThemeBoot, THEME_BOOT_URL } from './generate-theme-boot.mjs';

test('the committed theme boot matches a fresh generation', async () => {
  const { boot } = await buildThemeBoot();
  const committed = await readFile(THEME_BOOT_URL, 'utf8');
  assert.equal(committed, boot,
    'public/theme-boot.js is stale. Run `node scripts/generate-theme-boot.mjs`. It duplicates the storage key, theme ids and resolution order from src/theme.ts, and the only symptom of drift is a flash nobody reports.');
});

test('the boot script covers every theme the app offers', async () => {
  const themeSource = await readFile(new URL('../src/theme.ts', import.meta.url), 'utf8');
  const ids = [...themeSource.matchAll(/\{ id: '([^']+)', label:/g)].map(([, id]) => id);
  const committed = await readFile(THEME_BOOT_URL, 'utf8');
  assert.ok(ids.length > 0, 'Expected to read theme ids from src/theme.ts');
  for (const id of ids) {
    assert.ok(committed.includes(`"${id}"`), `theme-boot.js has no palette for ${id}`);
  }
});
