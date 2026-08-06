import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Rasterises the application icons from the one SVG that defines them.
 *
 * The PNGs exist because the web app manifest cannot take an SVG for every purpose, not because
 * they are separate artwork. Generating them means the SVG is the only file anyone edits, and the
 * drift test beside this proves the checked-in PNGs still match it — otherwise a change to the
 * mark would update the favicon and quietly leave the installed app showing the old one.
 *
 * Rendered through the browser already used for end-to-end tests rather than a new image
 * dependency: it is the same engine that will display the icon, so what it produces is what the
 * SVG actually means rather than a second interpretation of it.
 */

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

export const ICON_SIZES = [192, 512];
export const ICON_SOURCE = join(publicDir, 'favicon.svg');

export async function renderIcons(svg) {
  const browser = await chromium.launch();
  try {
    const rendered = new Map();
    for (const size of ICON_SIZES) {
      const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
      // The background is set to the icon's own field so the PNG is opaque, matching the manifest
      // background colour. A transparent icon inverts unpredictably against a light OS shell.
      await page.setContent(
        `<style>html,body{margin:0;padding:0;background:#100d09}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
      );
      rendered.set(size, await page.screenshot());
      await page.close();
    }
    return rendered;
  } finally {
    await browser.close();
  }
}

export function iconPath(size) {
  return join(publicDir, `icon-${size}.png`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const svg = await readFile(ICON_SOURCE, 'utf8');
  const rendered = await renderIcons(svg);
  for (const [size, buffer] of rendered) await writeFile(iconPath(size), buffer);
  console.log(`Generated ${ICON_SIZES.length} application icon(s) from favicon.svg.`);
}
