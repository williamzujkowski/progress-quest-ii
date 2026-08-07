const REQUIRED_NOTICES = [
  'Eric Fredricksen',
  'directed and reviewed by William Zujkowski',
  'AI-assisted research, implementation, and testing',
  'Johannes Baagøe',
  'Lucide Icons and Contributors',
  'SIL OPEN FONT LICENSE Version 1.1',
];

// Vite was on this list while the application shipped the starter favicon and its PWA
// rasterisations. Those are gone, no Vite-copyrighted code reaches the bundle, and Vite is a
// build-time dependency only - so there is no longer distributed content for the attribution to
// cover. scripts/test-app-icons.mjs holds the other end of that reasoning by refusing an icon
// carrying the starter mark, which is what would make an attribution owed again.

// `fontPackages` is derived from package.json rather than listed here on purpose. A generic
// "SIL OPEN FONT LICENSE" string was already satisfied by the existing entries, so adding a
// third font family shipped it with no attribution and the gate stayed green.
// Asserted positively, against the whole first line, rather than by looking for the old name.
// "PROGRESS QUEST III" contains "PROGRESS QUEST II", so an absence check reads as a failure on the
// correct string and passes on nothing useful. This file ships to users — the service worker
// precaches it — so its masthead is a product surface, and it carried the previous name for two
// renames because nothing here was watching it.
const NOTICES_HEADER = 'PROGRESS QUEST III — THIRD-PARTY NOTICES';

export function verifyProductionNotices(notices, worker, fontPackages = []) {
  const [header] = notices.split('\n');
  if (header?.trim() !== NOTICES_HEADER) {
    throw new Error(`Production third-party notices are headed "${header?.trim()}" rather than "${NOTICES_HEADER}".`);
  }
  for (const requiredNotice of REQUIRED_NOTICES) {
    if (!notices.includes(requiredNotice)) throw new Error(`Production third-party notices omit ${requiredNotice}.`);
  }
  for (const fontPackage of fontPackages) {
    if (!notices.includes(fontPackage)) {
      throw new Error(`Production third-party notices omit the bundled font package ${fontPackage}.`);
    }
  }
  if (!worker.includes('./THIRD_PARTY_NOTICES.txt')) {
    throw new Error('Production service worker does not precache the third-party notices.');
  }
}
