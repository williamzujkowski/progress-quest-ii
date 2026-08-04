import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyProductionNotices } from './production-notices.mjs';

const completeNotices = [
  'Eric Fredricksen',
  'Johannes Baagøe',
  'Lucide Icons and Contributors',
  'SIL OPEN FONT LICENSE Version 1.1',
  'Vite contributors',
].join('\n');

test('production notice verification accepts complete offline notices', () => {
  assert.doesNotThrow(() => verifyProductionNotices(completeNotices, 'const files = ["./THIRD_PARTY_NOTICES.txt"]'));
});

test('production notice verification rejects missing attribution', () => {
  assert.throws(
    () => verifyProductionNotices(completeNotices.replace('Johannes Baagøe', ''), './THIRD_PARTY_NOTICES.txt'),
    /omit Johannes Baagøe/,
  );
});

test('production notice verification rejects a notice omitted from the offline shell', () => {
  assert.throws(
    () => verifyProductionNotices(completeNotices, 'const files = []'),
    /does not precache the third-party notices/,
  );
});
