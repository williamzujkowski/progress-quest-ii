import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  downloadArchive,
  ensureArchive,
  resolveTarget,
} from './run-actionlint.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);

function checksum(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function responseFor(bytes, options = {}) {
  return {
    body: new Response(bytes).body,
    headers: new Headers(options.headers),
    ok: options.ok ?? true,
    status: options.status ?? 200,
    url: options.url ?? 'https://release-assets.githubusercontent.com/actionlint',
  };
}

test('workflow lint rejects syntax, expression, action-input, and script-injection defects', () => {
  const result = spawnSync(process.execPath, [
    'scripts/run-actionlint.mjs',
    'scripts/fixtures/actionlint-invalid.yml',
  ], { cwd: root, encoding: 'utf8' });
  const output = `${result.stdout}${result.stderr}`;

  assert.notEqual(result.status, 0, output);
  assert.match(output, /\[syntax-check\]/);
  assert.match(output, /\[expression\]/);
  assert.match(output, /\[action\]/);
  assert.match(output, /potentially untrusted/);
});

test('concurrent workflow lint launchers do not race over the verified executable', async () => {
  const runs = await Promise.all(Array.from({ length: 8 }, () => execFileAsync(
    process.execPath,
    ['scripts/run-actionlint.mjs', '-version'],
    { cwd: root },
  )));

  for (const { stdout } of runs) assert.match(stdout, /^1\.7\.12$/m);
});

test('cold concurrent downloads publish only verified bytes and repair a corrupt cache', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'progquest-actionlint-'));
  const archivePath = join(directory, 'actionlint.tar.gz');
  const bytes = Buffer.from('verified fixture archive');
  const expectedChecksum = checksum(bytes);
  const fetcher = async () => responseFor(bytes);

  try {
    await Promise.all(Array.from({ length: 8 }, () => ensureArchive(
      archivePath,
      'actionlint.tar.gz',
      expectedChecksum,
      fetcher,
    )));
    assert.deepEqual(await readFile(archivePath), bytes);

    await writeFile(archivePath, 'corrupt');
    await ensureArchive(archivePath, 'actionlint.tar.gz', expectedChecksum, fetcher);
    assert.deepEqual(await readFile(archivePath), bytes);

    await writeFile(archivePath, Buffer.alloc(10_000_001));
    await ensureArchive(archivePath, 'actionlint.tar.gz', expectedChecksum, fetcher);
    assert.deepEqual(await readFile(archivePath), bytes);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('download rejects an oversized streamed body before publishing it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'progquest-actionlint-'));
  const archivePath = join(directory, 'actionlint.tar.gz');
  const bytes = Buffer.from('too large');

  try {
    await assert.rejects(
      downloadArchive(
        archivePath,
        'actionlint.tar.gz',
        checksum(bytes),
        async () => responseFor(bytes),
        3,
      ),
      /exceeded 3 bytes/,
    );
    await assert.rejects(access(archivePath));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('download fails closed on provenance and integrity errors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'progquest-actionlint-'));
  const archivePath = join(directory, 'actionlint.tar.gz');
  const bytes = Buffer.from('fixture');

  try {
    await assert.rejects(
      downloadArchive(archivePath, 'actionlint.tar.gz', checksum(bytes), async () => responseFor(bytes, {
        url: 'https://example.com/actionlint',
      })),
      /untrusted host/,
    );
    await assert.rejects(
      downloadArchive(archivePath, 'actionlint.tar.gz', checksum(bytes), async () => responseFor(bytes, {
        ok: false,
        status: 503,
      })),
      /HTTP 503/,
    );
    await assert.rejects(
      downloadArchive(archivePath, 'actionlint.tar.gz', checksum(Buffer.from('other')), async () => responseFor(bytes)),
      /checksum mismatch/,
    );
    await assert.rejects(access(archivePath));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('unsupported actionlint platforms fail closed', () => {
  assert.throws(() => resolveTarget('aix', 'ppc64'), /unsupported platform aix\/ppc64/);
});
