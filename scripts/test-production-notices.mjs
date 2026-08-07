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

test('production notice verification rejects a notice omitted from the offline shell', () => {
  assert.throws(
    () => verifyProductionNotices(completeNotices, 'const files = []'),
    /does not precache the third-party notices/,
  );
});
