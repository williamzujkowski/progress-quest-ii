import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';

/**
 * Holds the coverage exclusion list to the reason it gives for existing.
 *
 * vite.config.ts excludes a handful of components from the coverage denominator because their
 * verification lives entirely in the Playwright suite, which the v8 provider cannot observe. The
 * list is itemised rather than a `src/components/**` glob precisely so that adding to it is a
 * visible decision — but nothing was checking that entries still qualify once added.
 *
 * They stop qualifying silently. #307 gave ItemTooltip a unit test while it was still excluded, so
 * real coverage was being discarded by exactly the mechanism the comment above the list warns
 * against, and the percentage overstated how much untested surface remained.
 *
 * An excluded file with a matching unit test is the whole failure condition. Which way to resolve
 * it is a judgement — drop the exclusion, or drop the test if it turned out not to be worth
 * keeping — so this reports rather than assumes.
 */

const CONFIG = 'vite.config.ts';

/** The unit test that would own a source file, by this project's fixed layout convention. */
const testPathFor = (source) => source.replace(/^src\//, 'src/__tests__/').replace(/\.tsx?$/, '.test.tsx');

const exists = async (path) => access(path).then(() => true, () => false);

const config = await readFile(CONFIG, 'utf8');

// The coverage `exclude` array specifically. `test.exclude` sits above it and lists e2e globs,
// which are not source files and would produce nonsense test paths.
const coverageBlock = config.slice(config.indexOf('coverage: {'));
const excludeBlock = coverageBlock.slice(coverageBlock.indexOf('exclude: ['), coverageBlock.indexOf(']', coverageBlock.indexOf('exclude: [')));
const excluded = [...excludeBlock.matchAll(/'([^']+)'/g)]
  .map(([, entry]) => entry)
  .filter((entry) => !entry.includes('*'));

test('every coverage exclusion still lacks the unit test that would disqualify it', async () => {
  // A regex over source that silently matches nothing would report a clean list rather than no
  // list. The same failure this suite exists to catch, one level up.
  assert.ok(excluded.length > 0, `Read no concrete coverage exclusions from ${CONFIG}; the parse has gone stale.`);

  const disqualified = [];
  for (const source of excluded) {
    const testPath = testPathFor(source);
    if (await exists(testPath)) disqualified.push(`${source} is excluded from coverage but ${testPath} tests it`);
  }

  assert.deepEqual(
    disqualified,
    [],
    `Coverage exclusions that have acquired unit tests:\n${disqualified.join('\n')}\n`
      + `Either drop the entry from ${CONFIG} so the coverage counts, or drop the test.`,
  );
});
