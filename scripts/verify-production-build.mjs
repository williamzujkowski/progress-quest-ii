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
let registersServiceWorker = false;
for (const name of jsFiles) {
  const source = await readFile(new URL(name, assetDirectory), 'utf8');
  // Per chunk: a development runtime anywhere means the whole build is wrong.
  if (source.includes('jsxDEV')) {
    throw new Error(`${name} contains React's development JSX runtime; the build did not run as production. Check that NODE_ENV is not set to development.`);
  }
  if (source.includes('serviceWorker')) registersServiceWorker = true;
}

// Across all chunks, not per chunk. Requiring every chunk to mention serviceWorker happened to
// hold while the build emitted exactly one, and would have failed a correct build the first time
// a lazy import or vendor split produced a second.
if (!registersServiceWorker) {
  throw new Error('No emitted JavaScript registers a service worker; offline mode would be silently absent.');
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

/**
 * A ceiling on what gets shipped, so a regression is a failed build rather than a discovery.
 *
 * Nothing has been watching this. A burst of feature work grew the bundle by about thirteen
 * kilobytes raw across ten additions, which is fine — but "fine" was established by measuring
 * once, and a measurement taken once is a fact about that afternoon.
 *
 * The numbers are generous on purpose: roughly a quarter above the size at the time of writing.
 * This is here to catch a dependency arriving by accident or a catalogue being embedded whole,
 * not to make a legitimate feature argue for its own bytes. A budget tight enough to trip on
 * ordinary work gets raised reflexively until it means nothing.
 */
const BUDGETS = { js: 560_000, css: 48_000 };

for (const [kind, files] of [['js', jsFiles], ['css', cssFiles]]) {
  const total = (await Promise.all(files.map(async (name) =>
    (await readFile(new URL(name, assetDirectory))).byteLength))).reduce((sum, size) => sum + size, 0);
  if (total > BUDGETS[kind]) {
    throw new Error(
      `Production ${kind.toUpperCase()} is ${total} bytes, over the ${BUDGETS[kind]} byte budget. `
      + 'Check for an unintended dependency or an embedded catalogue before raising this.',
    );
  }
}

const notices = await readFile(noticeUrl, 'utf8');
const worker = await readFile(workerUrl, 'utf8');
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const runtimePackages = Object.keys(manifest.dependencies ?? {});
const fontPackages = runtimePackages.filter((name) => name.startsWith('@fontsource'));
verifyProductionNotices(notices, worker, fontPackages, runtimePackages);

console.log(`Verified ${fontUrls.length} local font asset(s) across ${cssFiles.length} production CSS asset(s), within size budget.`);
