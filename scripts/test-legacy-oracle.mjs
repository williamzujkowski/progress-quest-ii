import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { runLegacyTransition } from './legacy-oracle.mjs';

const fixtureDirectory = new URL('../src/__tests__/fixtures/legacy/', import.meta.url);
const fixtureNames = (await readdir(fixtureDirectory))
  .filter((name) => name.endsWith('.json'))
  .sort();
const baseFixture = JSON.parse(await readFile(new URL('one-kill.json', fixtureDirectory), 'utf8'));

for (const fixtureName of fixtureNames) {
  const fixture = JSON.parse(await readFile(new URL(fixtureName, fixtureDirectory), 'utf8'));
  test(`legacy oracle emits deterministic ${fixtureName.replace('.json', '')} vector`, () => {
    const first = runLegacyTransition(fixture.input);
    const second = runLegacyTransition(fixture.input);

    assert.deepEqual(first, fixture.expected);
    assert.equal(JSON.stringify(second), JSON.stringify(first));
  });
}

test('legacy oracle rejects states Alea could not have serialized', () => {
  assert.throws(
    () => runLegacyTransition({
      sheet: {
        ...baseFixture.input.sheet,
        seed: [0.1, 0.2, 0.3, 1],
      },
    }),
    /serialized Alea state/,
  );
  assert.throws(
    () => runLegacyTransition({
      sheet: { ...baseFixture.input.sheet, seed: [0, 0, 0, 2091639] },
    }),
    /serialized Alea state/,
  );
});
