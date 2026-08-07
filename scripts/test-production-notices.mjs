import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyProductionNotices } from './production-notices.mjs';

const completeNotices = [
  'PROGRESS QUEST III — THIRD-PARTY NOTICES',
  'Eric Fredricksen',
  'directed and reviewed by William Zujkowski',
  'AI-assisted research, implementation, and testing',
  'Johannes Baagøe',
  'Lucide Icons and Contributors',
  'SIL OPEN FONT LICENSE Version 1.1',
].join('\n');

test('production notice verification accepts complete offline notices', () => {
  assert.doesNotThrow(() => verifyProductionNotices(completeNotices, 'const files = ["./THIRD_PARTY_NOTICES.txt"]'));
});

test('production notice verification refuses a stale project name in the masthead', () => {
  // This file ships: the service worker precaches it, so its first line is a product surface. It
  // carried "PROGRESS QUEST II" through two renames because nothing was reading it. Asserted
  // positively because "PROGRESS QUEST III" contains "PROGRESS QUEST II" — looking for the old
  // name would fail on the correct string and pass on anything else.
  assert.throws(
    () => verifyProductionNotices(
      completeNotices.replace('PROGRESS QUEST III —', 'PROGRESS QUEST II —'),
      'const files = ["./THIRD_PARTY_NOTICES.txt"]',
    ),
    /headed "PROGRESS QUEST II/,
  );
  assert.throws(
    () => verifyProductionNotices(
      completeNotices.split('\n').slice(1).join('\n'),
      'const files = ["./THIRD_PARTY_NOTICES.txt"]',
    ),
    /rather than/,
  );
});

test('production notice verification rejects missing attribution', () => {
  assert.throws(
    () => verifyProductionNotices(completeNotices.replace('Johannes Baagøe', ''), './THIRD_PARTY_NOTICES.txt'),
    /omit Johannes Baagøe/,
  );
});

test('production notice verification rejects missing project credit', () => {
  assert.throws(
    () => verifyProductionNotices(completeNotices.replace('directed and reviewed by William Zujkowski', ''), './THIRD_PARTY_NOTICES.txt'),
    /omit directed and reviewed by William Zujkowski/,
  );
});

test('production notice verification rejects a shipped dependency the notices do not attribute', () => {
  // The case this gate was extended for. `remarque-tokens` was a production dependency emitting
  // custom properties into the CSS bundle while appearing in neither the notices nor the
  // provenance inventory (#326). The font-only version of this check could not see it.
  assert.throws(
    () => verifyProductionNotices(completeNotices, 'const files = ["./THIRD_PARTY_NOTICES.txt"]', ['remarque-tokens']),
    /omit the shipped dependency remarque-tokens/,
  );
  assert.doesNotThrow(
    () => verifyProductionNotices(
      `${completeNotices}\nremarque-tokens 0.26.0 — MIT`,
      'const files = ["./THIRD_PARTY_NOTICES.txt"]',
      ['remarque-tokens'],
    ),
  );
});

test('production notice verification rejects a dependency with no attribution decision recorded', () => {
  // A new production dependency has no marker, so it cannot be checked, so it fails. Passing an
  // unrecognised package silently is the exact behaviour that let #326 happen: the gate reported
  // green on a list that had never been asked about the package at all.
  assert.throws(
    () => verifyProductionNotices(completeNotices, 'const files = ["./THIRD_PARTY_NOTICES.txt"]', ['some-new-package']),
    /some-new-package has no attribution recorded/,
  );
});

test('production notice verification does not mistake inherited object keys for markers', () => {
  // NOTICE_MARKERS is a plain object literal, so `markers[name]` for `constructor` or `toString`
  // returns a function rather than undefined. Read with a lookup that ignores the prototype, a
  // package with one of those names is unrecorded and fails; read with plain indexing it resolves
  // to `Function.prototype.toString` and `notices.includes(fn)` decides attribution. Same defect
  // class as #308.
  for (const inherited of ['constructor', 'toString', 'valueOf', '__proto__']) {
    assert.throws(
      () => verifyProductionNotices(completeNotices, 'const files = ["./THIRD_PARTY_NOTICES.txt"]', [inherited]),
      /has no attribution recorded/,
      `expected the inherited key ${inherited} to be treated as unrecorded`,
    );
  }
});

test('production notice verification rejects a notice omitted from the offline shell', () => {
  assert.throws(
    () => verifyProductionNotices(completeNotices, 'const files = []'),
    /does not precache the third-party notices/,
  );
});
