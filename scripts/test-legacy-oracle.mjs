import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runLegacyTransition } from './legacy-oracle.mjs';

const fixture = JSON.parse(
  await readFile(new URL('../src/__tests__/fixtures/legacy/one-kill.json', import.meta.url), 'utf8'),
);

test('legacy oracle emits a deterministic fixed one-kill transition vector', () => {
  const first = runLegacyTransition(fixture.input);
  const second = runLegacyTransition(fixture.input);

  assert.deepEqual(first, fixture.expected);
  assert.equal(JSON.stringify(second), JSON.stringify(first));
});

test('legacy oracle rejects states Alea could not have serialized', () => {
  assert.throws(
    () => runLegacyTransition({ sheet: { ...fixture.input.sheet, seed: [0.1, 0.2, 0.3, 1] } }),
    /serialized Alea state/,
  );
});
