import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';

const distDirectory = new URL('../dist/', import.meta.url);
const workerUrl = new URL('sw.js', distDirectory);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const url = new URL(entry.name, directory);
    return entry.isDirectory() ? listFiles(new URL(`${entry.name}/`, directory)) : [url];
  }));
  return nested.flat();
}

// Font subsets the interface can never render. Browsers already skip these at runtime via
// @font-face unicode-range, so the waste is specific to offline install: precaching every
// subset unconditionally put ~128 kB of glyphs nobody can see into every user's cache.
//
// `latin-ext` is deliberately absent from this list and must stay precached — it is genuinely
// used, by `œ` in src/data/traits.ts and `ü`/`Ü` in src/engine/text.ts.
const UNRENDERABLE_FONT_SUBSETS = ['cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'];
const KNOWN_FONT_SUBSETS = [...UNRENDERABLE_FONT_SUBSETS, 'latin', 'latin-ext'];

function isUnrenderableFont(pathname) {
  if (!pathname.endsWith('.woff2')) return false;
  const name = pathname.split('/').pop() ?? '';
  const subset = KNOWN_FONT_SUBSETS.filter((candidate) => name.includes(`-${candidate}-`))
    // `latin-ext` also contains `latin`; take the most specific match.
    .sort((a, b) => b.length - a.length)[0];
  if (!subset) {
    // Fail loudly rather than guess. Silently dropping a font nobody recognised would take
    // glyphs out of the offline shell with no signal that it happened.
    throw new Error(`Unrecognised font asset ${name}: add its subset to KNOWN_FONT_SUBSETS before it can be classified.`);
  }
  return UNRENDERABLE_FONT_SUBSETS.includes(subset);
}

const artifactUrls = (await listFiles(distDirectory))
  .filter((url) => url.pathname !== workerUrl.pathname && !url.pathname.endsWith('.map'))
  .filter((url) => !isUnrenderableFont(url.pathname));
const files = artifactUrls
  .map((url) => `./${relative(distDirectory.pathname, url.pathname).split(sep).join('/')}`)
  .sort();
const template = await readFile(workerUrl, 'utf8');

async function contentBuildId() {
  const hash = createHash('sha256');
  hash.update('worker-template\0');
  hash.update(template);
  hash.update('\0');
  for (const url of artifactUrls.sort((left, right) => left.pathname.localeCompare(right.pathname))) {
    hash.update(relative(distDirectory.pathname, url.pathname));
    hash.update('\0');
    hash.update(await readFile(url));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

const buildId = process.env.GITHUB_SHA ?? await contentBuildId();
const worker = template
  .replace('__BUILD_ID__', buildId)
  .replace('__PRECACHE_URLS__', JSON.stringify(files));

if (worker.includes('__BUILD_ID__') || worker.includes('__PRECACHE_URLS__')) {
  throw new Error('Service worker template placeholders were not fully replaced.');
}

await writeFile(workerUrl, worker);
console.log(`Generated service worker for ${buildId} with ${files.length} precache entries.`);
