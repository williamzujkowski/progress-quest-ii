import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every terminal slot the stylesheet declares must have something reading it.
 *
 * `--terminal-cursor` was declared for the hand-authored `progros` theme and read by nothing — not
 * in `src/`, not in the vendor stylesheet, not in the build output. It was there because the vendor
 * themes all carry the slot, so mirroring their list looked like the careful thing to do. But
 * progros declares ten of the twenty, so the list was never a contract it was keeping; the line was
 * just a value a reader had to rule out before trusting the block.
 *
 * Scoped to `src/index.css` on purpose. The slots `applyTheme` sets inline come from `COLOR_KEYS`,
 * which `src/__tests__/theme.test.ts` pins to the package's own list — that side must keep all
 * twenty whether this app reads them or not, and asserting the opposite here would put the two
 * tests in conflict over the same names.
 */

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

/** Every source file that could carry a `var()`, so a reader is found wherever it later moves to. */
async function sources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sources(path)));
    } else if (/\.(css|ts|tsx)$/.test(entry.name)) {
      files.push(await readFile(path, 'utf8'));
    }
  }
  return files;
}

test('index.css declares no terminal colour slot that nothing reads', async () => {
  const stylesheet = await readFile(join(SRC, 'index.css'), 'utf8');
  const declared = [...stylesheet.matchAll(/^\s*(--terminal-[a-z-]+):/gm)].map((match) => match[1]);

  // The sweep is worth nothing if either half stops matching the tree it is reading: a pattern
  // that finds no declarations, or a walk that finds no files, passes without checking anything.
  assert.ok(declared.length > 5, `found only ${declared.length} terminal slots in index.css`);
  const corpus = await sources(SRC);
  assert.ok(corpus.length > 20, `walked only ${corpus.length} source files`);

  const unread = declared.filter((slot) => !corpus.some((file) => file.includes(`var(${slot}`)));
  assert.deepEqual(
    unread,
    [],
    `Declared in src/index.css and read by nothing under src/:\n${unread.map((slot) => `  ${slot}`).join('\n')}`,
  );
});
