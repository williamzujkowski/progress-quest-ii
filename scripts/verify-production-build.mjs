import { access, readdir, readFile } from 'node:fs/promises';
import { verifyProductionNotices } from './production-notices.mjs';

const assetDirectory = new URL('../dist/assets/', import.meta.url);
const noticeUrl = new URL('../dist/THIRD_PARTY_NOTICES.txt', import.meta.url);
const workerUrl = new URL('../dist/sw.js', import.meta.url);
const cssFiles = (await readdir(assetDirectory)).filter((name) => name.endsWith('.css'));
const fontUrls = [];

if (cssFiles.length === 0) throw new Error('Production build emitted no CSS asset to verify.');

for (const name of cssFiles) {
  const cssUrl = new URL(name, assetDirectory);
  const css = await readFile(cssUrl, 'utf8');
  if (css.includes('data:font')) {
    throw new Error(`${name} contains a data-URL font blocked by the production Content Security Policy.`);
  }

  for (const face of css.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    for (const source of face[0].matchAll(/url\(([^)]+)\)/g)) {
      const target = source[1].trim().replace(/^(['"])(.*)\1$/, '$2');
      if (!target.startsWith('./') || !target.split(/[?#]/, 1)[0].endsWith('.woff2')) {
        throw new Error(`${name} contains a font URL that is not a local .woff2 asset: ${target}`);
      }
      fontUrls.push(new URL(target, cssUrl));
    }
  }
}

if (fontUrls.length === 0) throw new Error('Production CSS declares no font assets to verify.');
await Promise.all(fontUrls.map((fontUrl) => access(fontUrl)));

const notices = await readFile(noticeUrl, 'utf8');
const worker = await readFile(workerUrl, 'utf8');
verifyProductionNotices(notices, worker);

console.log(`Verified ${fontUrls.length} local font asset(s) across ${cssFiles.length} production CSS asset(s).`);
