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

const files = (await listFiles(distDirectory))
  .filter((url) => url.pathname !== workerUrl.pathname && !url.pathname.endsWith('.map'))
  .map((url) => `./${relative(distDirectory.pathname, url.pathname).split(sep).join('/')}`)
  .sort();

const buildId = process.env.GITHUB_SHA ?? 'development';
const template = await readFile(workerUrl, 'utf8');
const worker = template
  .replace('__BUILD_ID__', buildId)
  .replace('__PRECACHE_URLS__', JSON.stringify(files));

if (worker.includes('__BUILD_ID__') || worker.includes('__PRECACHE_URLS__')) {
  throw new Error('Service worker template placeholders were not fully replaced.');
}

await writeFile(workerUrl, worker);
console.log(`Generated service worker for ${buildId} with ${files.length} precache entries.`);
