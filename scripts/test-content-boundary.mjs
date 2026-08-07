import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Guards the content boundary the provenance work established.
 *
 * Two projects are named as off-limits until their rights are resolved: a GPL-3.0 sequel whose
 * code cannot be combined with an MIT distribution, and a freeware release with no surviving
 * license grant. That decision has been recorded in prose, and prose alone is not a control -
 * nothing has been stopping the next contributor from importing either.
 *
 * WHAT THIS DETECTS, stated plainly so nobody mistakes it for more:
 *
 * - Material that arrives carrying its origin, which is how imported files usually arrive: an
 *   attribution header, a license banner, a project name in a comment or a path.
 * - The boundary statements themselves being deleted from the documents that carry them.
 *
 * WHAT IT CANNOT DETECT: code that was copied and stripped of every trace of where it came from.
 * No text search can. Claiming otherwise would make this the kind of gate that reports success
 * while checking nothing, which is the failure it exists to avoid.
 */

// Named where they appear in the provenance record. Matching is case-insensitive.
const EXCLUDED_SOURCES = ['nbollom', 'DragonII'];

/**
 * Directories that ship or build the application. `docs/` is deliberately absent: the research
 * notes and the provenance inventory have to name these projects in order to exclude them, and a
 * check that forbade discussing a boundary would be unusable.
 *
 * `pq-web-src/` is absent for a different reason - it is the sanctioned read-only oracle, with its
 * own separate provenance record.
 */
const SCANNED_DIRECTORIES = ['src', 'e2e', 'e2e-pwa', 'scripts', 'public'];

const TEXT_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|css|html|json|txt|webmanifest)$/;

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (TEXT_FILE.test(entry.name)) yield path;
  }
}

test('no shipped or build file carries an excluded project origin', async () => {
  const offending = [];
  let scanned = 0;

  for (const directory of SCANNED_DIRECTORIES) {
    for await (const path of walk(directory)) {
      // This file names the excluded projects in order to look for them.
      if (path.endsWith('test-content-boundary.mjs')) continue;
      scanned += 1;
      const contents = (await readFile(path, 'utf8')).toLowerCase();
      for (const source of EXCLUDED_SOURCES) {
        if (contents.includes(source.toLowerCase())) offending.push(`${path}: ${source}`);
      }
    }
  }

  // A renamed directory or a stale TEXT_FILE pattern scans nothing, and "found no offending
  // material" then means "looked at no material". The gate has to prove it looked.
  assert.ok(scanned > 0, 'Scanned no files; SCANNED_DIRECTORIES or TEXT_FILE has gone stale.');

  assert.deepEqual(
    offending,
    [],
    `Material from an excluded source appears to have been imported:\n${offending.join('\n')}\n`
      + 'See docs/content-provenance.md. Importing it needs the rights resolved first.',
  );
});

test('the documents still say what may be licensed under MIT', async () => {
  // A boundary nobody restates is a boundary that quietly stops applying. These are the sentences
  // the provenance work turns on, so their deletion should fail rather than pass unnoticed.
  const license = await readFile('LICENSE', 'utf8');
  assert.match(license, /applies only to material/i, 'LICENSE lost its scope note.');
  assert.match(license, /docs\/content-provenance\.md/, 'LICENSE no longer points at the inventory.');

  const readme = await readFile('README.md', 'utf8');
  assert.match(
    readme,
    /root MIT license covers only material the project has authority to license under MIT/i,
    'README lost the statement bounding the MIT grant.',
  );

  const provenance = await readFile('docs/content-provenance.md', 'utf8');
  for (const source of EXCLUDED_SOURCES) {
    assert.ok(
      provenance.toLowerCase().includes(source.toLowerCase()),
      `docs/content-provenance.md no longer records ${source} as a non-import source.`,
    );
  }
});
