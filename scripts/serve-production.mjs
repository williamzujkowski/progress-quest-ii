import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const host = '127.0.0.1';
const port = 4173;
const basePath = '/progress-quest-ii/';
const distPath = resolve('dist');
const workerModes = new Set(['normal', 'missing', 'update', 'broken', 'stalled']);
let workerMode = 'normal';
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? '/', `http://${host}:${port}`).pathname;
    if (!pathname.startsWith(basePath)) {
      response.writeHead(404).end();
      return;
    }

    if (request.method === 'POST' && pathname.startsWith(`${basePath}__test__/worker-mode/`)) {
      const mode = pathname.slice(`${basePath}__test__/worker-mode/`.length);
      if (!workerModes.has(mode)) {
        response.writeHead(400).end();
        return;
      }
      workerMode = mode;
      response.writeHead(204).end();
      return;
    }

    const relativePath = decodeURIComponent(pathname.slice(basePath.length)) || 'index.html';
    const filePath = resolve(distPath, relativePath);
    if (filePath !== distPath && !filePath.startsWith(`${distPath}${sep}`)) {
      response.writeHead(404).end();
      return;
    }

    if (relativePath === 'sw.js' && workerMode === 'missing') {
      response.writeHead(404).end();
      return;
    }

    let contents = await readFile(filePath);
    if (relativePath === 'sw.js' && workerMode !== 'normal') {
      let worker = contents.toString();
      if (workerMode === 'update' || workerMode === 'stalled') {
        worker = worker.replace(/(const CACHE_NAME = `\$\{CACHE_PREFIX\})[^`]+/, `$1pwa-test-${workerMode}`);
        if (workerMode === 'stalled') worker = worker.replace(') void self.skipWaiting();', ') void 0;');
      } else {
        worker = worker
          .replace(/(const CACHE_NAME = `\$\{CACHE_PREFIX\})[^`]+/, '$1pwa-test-broken')
          .replace('const PRECACHE_URLS = [', "const PRECACHE_URLS = ['./__test__/missing-build-asset',");
      }
      contents = Buffer.from(worker);
    }
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    }).end(contents);
  } catch {
    response.writeHead(404).end();
  }
});

server.listen(port, host, () => console.log(`Serving dist at http://${host}:${port}${basePath}`));
