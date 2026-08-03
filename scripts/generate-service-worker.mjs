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

const artifactUrls = (await listFiles(distDirectory))
  .filter((url) => url.pathname !== workerUrl.pathname && !url.pathname.endsWith('.map'));
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
