import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, copyFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { Transform, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '1.7.12';
const MAX_ARCHIVE_BYTES = 10_000_000;
const ALLOWED_DOWNLOAD_HOSTS = new Set(['github.com', 'release-assets.githubusercontent.com']);
const TARGETS = {
  'darwin:arm64': ['actionlint_1.7.12_darwin_arm64.tar.gz', 'aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f'],
  'darwin:x64': ['actionlint_1.7.12_darwin_amd64.tar.gz', '5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644'],
  'linux:arm64': ['actionlint_1.7.12_linux_arm64.tar.gz', '325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6'],
  'linux:x64': ['actionlint_1.7.12_linux_amd64.tar.gz', '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8'],
  'win32:arm64': ['actionlint_1.7.12_windows_arm64.zip', 'cadcf7ea4efe3a68728893813643cebe1185e5b1d4be5b96245f65c9a4d5ea41'],
  'win32:x64': ['actionlint_1.7.12_windows_amd64.zip', '6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9'],
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function resolveTarget(platform, architecture) {
  const target = TARGETS[`${platform}:${architecture}`];
  if (!target) throw new Error(`unsupported platform ${platform}/${architecture}`);
  return target;
}

async function fileChecksum(path, maxBytes = MAX_ARCHIVE_BYTES) {
  try {
    if ((await stat(path)).size > maxBytes) return undefined;
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest('hex');
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function archiveMatches(path, expectedChecksum) {
  return (await fileChecksum(path)) === expectedChecksum;
}

async function publishArchive(temporaryPath, archivePath, expectedChecksum) {
  try {
    await rename(temporaryPath, archivePath);
  } catch (error) {
    if (!['EEXIST', 'EPERM'].includes(error?.code)) throw error;
    if (await archiveMatches(archivePath, expectedChecksum)) return;
    await rm(archivePath, { force: true });
    try {
      await rename(temporaryPath, archivePath);
    } catch (retryError) {
      if (!(await archiveMatches(archivePath, expectedChecksum))) throw retryError;
    }
  }
}

export async function downloadArchive(
  archivePath,
  filename,
  expectedChecksum,
  fetcher = fetch,
  maxBytes = MAX_ARCHIVE_BYTES,
) {
  const url = `https://github.com/rhysd/actionlint/releases/download/v${VERSION}/${filename}`;
  const response = await fetcher(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`download failed with HTTP ${response.status}`);
  const finalHost = new URL(response.url).hostname;
  if (!ALLOWED_DOWNLOAD_HOSTS.has(finalHost)) throw new Error(`download redirected to untrusted host ${finalHost}`);
  const declaredSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    throw new Error(`download exceeded ${maxBytes} bytes`);
  }
  if (!response.body) throw new Error('download returned no body');

  const temporaryPath = `${archivePath}.${process.pid}-${randomUUID()}.tmp`;
  const hash = createHash('sha256');
  let receivedBytes = 0;
  const verifier = new Transform({
    transform(chunk, _encoding, callback) {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        callback(new Error(`download exceeded ${maxBytes} bytes`));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(response.body),
      verifier,
      createWriteStream(temporaryPath, { flags: 'wx', mode: 0o600 }),
    );
    const actualChecksum = hash.digest('hex');
    if (actualChecksum !== expectedChecksum) {
      throw new Error(`checksum mismatch for ${filename}: expected ${expectedChecksum}, received ${actualChecksum}`);
    }
    await publishArchive(temporaryPath, archivePath, expectedChecksum);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function ensureArchive(
  archivePath,
  filename,
  expectedChecksum,
  fetcher = fetch,
) {
  if (await archiveMatches(archivePath, expectedChecksum)) return;
  await downloadArchive(archivePath, filename, expectedChecksum, fetcher);
  if (!(await archiveMatches(archivePath, expectedChecksum))) {
    // A concurrent corrupt-cache repair may replace the shared path between publish and verification.
    await downloadArchive(archivePath, filename, expectedChecksum, fetcher);
    if (!(await archiveMatches(archivePath, expectedChecksum))) {
      throw new Error(`verified cache publication failed for ${filename}`);
    }
  }
}

async function main() {
  const [filename, expectedChecksum] = resolveTarget(process.platform, process.arch);
  const cacheDir = join(root, 'node_modules', '.cache', 'actionlint', VERSION);
  const archivePath = join(cacheDir, filename);
  const executableName = process.platform === 'win32' ? 'actionlint.exe' : 'actionlint';
  const extractionDir = join(cacheDir, `run-${process.pid}`);
  const privateArchivePath = join(extractionDir, filename);
  const executablePath = join(extractionDir, executableName);
  await mkdir(cacheDir, { recursive: true });
  await ensureArchive(archivePath, filename, expectedChecksum);
  await mkdir(extractionDir, { recursive: true });
  try {
    await copyFile(archivePath, privateArchivePath);
    if (!(await archiveMatches(privateArchivePath, expectedChecksum))) {
      throw new Error(`private archive checksum mismatch for ${filename}`);
    }

    // ponytail: supported developer and hosted-runner systems already provide tar; avoid an archive dependency for one binary.
    const extractArgs = [process.platform === 'win32' ? '-xf' : '-xzf', privateArchivePath, '-C', extractionDir, executableName];
    const extraction = spawnSync('tar', extractArgs, { encoding: 'utf8' });
    if (extraction.error) throw extraction.error;
    if (extraction.status !== 0) throw new Error(`archive extraction failed: ${extraction.stderr.trim()}`);
    if (process.platform !== 'win32') await chmod(executablePath, 0o755);

    const version = spawnSync(executablePath, ['-version'], { encoding: 'utf8' });
    if (version.error) throw version.error;
    if (version.status !== 0 || version.stdout.split('\n', 1)[0] !== VERSION) {
      throw new Error(`unexpected actionlint version: ${version.stdout.trim() || version.stderr.trim()}`);
    }

    const result = spawnSync(
      executablePath,
      ['-shellcheck=', '-pyflakes=', ...process.argv.slice(2)],
      { cwd: process.cwd(), stdio: 'inherit' },
    );
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    await rm(extractionDir, { force: true, recursive: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(`actionlint launcher: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
