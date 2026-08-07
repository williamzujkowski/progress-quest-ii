import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyProductionNotices } from './production-notices.mjs';

const completeNotices = [
  'Eric Fredricksen',
  'directed and reviewed by William Zujkowski',
  'AI-assisted research, implementation, and testing',
  'Johannes Baagøe',
  'Lucide Icons and Contributors',
  'React and React DOM',
  'SIL OPEN FONT LICENSE Version 1.1',
  'remarque-tokens',
].join('\n');

test('production notice verification accepts complete offline notices', () => {
  assert.doesNotThrow(() => verifyProductionNotices(
    completeNotices,
    'const files = ["./THIRD_PARTY_NOTICES.txt"]',
    [],
    ['react', 'react-dom', 'lucide-react', 'remarque-tokens'],
  ));
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

test('production notice verification rejects a missing runtime package', () => {
  assert.throws(
    () => verifyProductionNotices(completeNotices.replace('remarque-tokens', ''), './THIRD_PARTY_NOTICES.txt', [], ['remarque-tokens']),
    /omit the bundled runtime package remarque-tokens/,
  );
});
