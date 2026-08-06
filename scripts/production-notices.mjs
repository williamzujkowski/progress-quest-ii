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
export function verifyProductionNotices(notices, worker, fontPackages = []) {
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
