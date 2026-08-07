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

// The dependency check is driven from package.json rather than listed here on purpose, and it now
// covers every production dependency rather than only the fonts. The narrower version existed
// because a generic "SIL OPEN FONT LICENSE" string was already satisfied by the existing entries,
// so adding a third font family shipped it with no attribution and the gate stayed green. That is
// a fact about lists maintained by hand, not a fact about fonts: `remarque-tokens` was added as a
// production dependency, shipped its custom properties into the bundle, and appeared in neither
// the notices nor the provenance inventory, for exactly the same reason.
//
// So the direction of the check is inverted. package.json names the packages, and each one must
// map to a string this file expects to find in the notices. A dependency with no entry in
// NOTICE_MARKERS fails the build rather than passing silently — adding a production dependency
// without deciding its attribution is the failure being prevented, and an unrecorded package is
// indistinguishable from an unconsidered one.
//
// Most markers are the package name, because that is what the notices already print. The ones that
// differ are packages the notices name in prose ("React and React DOM") rather than by specifier.
// Markers are names, not versions: `^` ranges drift on every install and a version-pinned gate
// would fail on a routine patch bump while proving nothing about attribution.
//
// A marker has to be a string that appears *only* where the package is attributed. This is easy to
// weaken by accident: the first draft of the `remarque-tokens` notice named the import specifier in
// its own body text, so deleting the attribution line left the marker satisfied by the leftover
// prose and the gate stayed green. Prose in this file should describe a package without repeating
// its marker.
const NOTICE_MARKERS = {
  '@fontsource-variable/inter': '@fontsource-variable/inter',
  '@fontsource-variable/jetbrains-mono': '@fontsource-variable/jetbrains-mono',
  '@fontsource-variable/newsreader': '@fontsource-variable/newsreader',
  '@williamzujkowski/oklch-terminal-themes': '@williamzujkowski/oklch-terminal-themes',
  'lucide-react': 'LUCIDE REACT',
  react: 'React and React DOM',
  'react-dom': 'React and React DOM',
  'remarque-tokens': 'remarque-tokens',
  zod: 'Zod',
  zustand: 'Zustand',
};

// Asserted positively, against the whole first line, rather than by looking for the old name.
// "PROGRESS QUEST III" contains "PROGRESS QUEST II", so an absence check reads as a failure on the
// correct string and passes on nothing useful. This file ships to users — the service worker
// precaches it — so its masthead is a product surface, and it carried the previous name for two
// renames because nothing here was watching it.
const NOTICES_HEADER = 'PROGRESS QUEST III — THIRD-PARTY NOTICES';

export function verifyProductionNotices(notices, worker, productionDependencies = []) {
  const [header] = notices.split('\n');
  if (header?.trim() !== NOTICES_HEADER) {
    throw new Error(`Production third-party notices are headed "${header?.trim()}" rather than "${NOTICES_HEADER}".`);
  }
  for (const requiredNotice of REQUIRED_NOTICES) {
    if (!notices.includes(requiredNotice)) throw new Error(`Production third-party notices omit ${requiredNotice}.`);
  }
  for (const dependency of productionDependencies) {
    const marker = Object.hasOwn(NOTICE_MARKERS, dependency) ? NOTICE_MARKERS[dependency] : undefined;
    if (marker === undefined) {
      throw new Error(
        `Production dependency ${dependency} has no attribution recorded in scripts/production-notices.mjs. `
        + 'Add it to public/THIRD_PARTY_NOTICES.txt and docs/content-provenance.md, then record the string '
        + 'that proves it is there in NOTICE_MARKERS.',
      );
    }
    if (!notices.includes(marker)) {
      throw new Error(`Production third-party notices omit the shipped dependency ${dependency}.`);
    }
  }
  if (!worker.includes('./THIRD_PARTY_NOTICES.txt')) {
    throw new Error('Production service worker does not precache the third-party notices.');
  }
}
