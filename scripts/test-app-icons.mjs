import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { ICON_SIZES, ICON_SOURCE, iconPath, renderIcons } from './generate-app-icons.mjs';

/**
 * The checked-in PNGs must still be what the SVG renders to.
 *
 * Without this, editing the mark updates the favicon and silently leaves every installed app
 * showing the old one — a divergence nothing else in the suite can see, because both files remain
 * individually valid.
 */

test('the shipped icons match the source they are generated from', async () => {
  const svg = await readFile(ICON_SOURCE, 'utf8');
  const rendered = await renderIcons(svg);

  for (const size of ICON_SIZES) {
    const shipped = await readFile(iconPath(size));
    assert.ok(
      shipped.equals(rendered.get(size)),
      `public/icon-${size}.png differs from favicon.svg. Run: node scripts/generate-app-icons.mjs`,
    );
  }
});

test('the icon is first-party artwork rather than a starter asset', async () => {
  const svg = await readFile(ICON_SOURCE, 'utf8');

  // Names the application, so the file identifies what it belongs to rather than only how it draws.
  assert.match(svg, /<title>Progress Quest II<\/title>/);
  // The starter mark this replaced was a single filled path in one signature colour. Asserting its
  // absence keeps a regeneration from a stale source from quietly reinstating it.
  assert.doesNotMatch(svg, /863bff|7e14ff/i, 'the favicon must not carry the starter mark colours');
});
