# Legacy fixtures

Every `.json` file here, including those under `monster-tasks/`, is a vector for the real
`pq-web-src` code rather than for this port.

`scripts/test-legacy-oracle.mjs` reads all of them on every `npm test`, runs each `input` through
`scripts/legacy-oracle.mjs` — which executes the original JavaScript in a `vm` — and asserts the
result deep-equals the recorded `expected`. It runs each twice and requires the two to agree, so a
fixture that had drifted from the legacy behaviour, or that had been captured from this port by
mistake, fails there rather than quietly becoming the thing parity is measured against.

That is the provenance guarantee, and it is a property of the round trip rather than a label on a
file. A fixture added here without being picked up by that script would carry no guarantee at all;
the script globs the directory precisely so that cannot happen silently.
