import { access, readdir, readFile } from 'node:fs/promises';
import { verifyProductionNotices } from './production-notices.mjs';

const assetDirectory = new URL('../dist/assets/', import.meta.url);
const noticeUrl = new URL('../dist/THIRD_PARTY_NOTICES.txt', import.meta.url);
const workerUrl = new URL('../dist/sw.js', import.meta.url);
const assetNames = await readdir(assetDirectory);
const cssFiles = assetNames.filter((name) => name.endsWith('.css'));
const jsFiles = assetNames.filter((name) => name.endsWith('.js'));
const fontUrls = [];

if (cssFiles.length === 0) throw new Error('Production build emitted no CSS asset to verify.');
if (jsFiles.length === 0) throw new Error('Production build emitted no JavaScript asset to verify.');

// An ambient NODE_ENV=development survives `vite build` (Vite only defaults NODE_ENV when it is
// unset, and --mode does not override it). That flips import.meta.env.DEV to true, which
// dead-code-eliminates the service-worker registration in src/pwa.ts and ships React's
// development build. The result still looks like a successful build, so fail loudly here
// instead of shipping an app with no offline mode.
for (const name of jsFiles) {
  const source = await readFile(new URL(name, assetDirectory), 'utf8');
  if (source.includes('jsxDEV')) {
    throw new Error(`${name} contains React's development JSX runtime; the build did not run as production. Check that NODE_ENV is not set to development.`);
  }
  if (!source.includes('serviceWorker')) {
    throw new Error(`${name} contains no service-worker registration; offline mode would be silently absent.`);
  }
}

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
