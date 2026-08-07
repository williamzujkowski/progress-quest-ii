# Retire the legacy oracle and the pq-web-src submodule

ADR 0003 retired the claim of parity with Progress Quest and kept the machinery that measured it.
This retires the machinery. The `pq-web-src` submodule is removed, `scripts/legacy-oracle.mjs` and
its test are deleted, and neither `npm test` nor CI fetches or executes third-party code any more.
This supersedes the paragraph in ADR 0003 that gave the oracle a continuing job; the rest of that
decision stands.

The oracle was a good instrument for the question it was built to answer. It loaded the original
`config.js` and `main.js` into a `node:vm` context and ran one real transition, which is how every
fixture in `src/__tests__/fixtures/goldens/` came to hold values this project could not have
invented for itself. That is worth something permanent. What it cost was ongoing: a checkout of
unmaintained 2000s JavaScript on every clone and every CI run, a submodule URL that had to be
pinned and verified in two workflows before anything read it, a lint config that existed only to
avoid linting it, a CodeQL exemption, a scanning exemption in the content-boundary check, and a
row in the security policy explaining why a whole directory was out of scope. Six guards, all
protecting the same one directory, on a repository whose own decision two ADRs ago was that it is
not a port.

The instrument had also finished its work. Every question the oracle was built to settle has been
settled and written down — in the fixtures, in `docs/contracts/state-and-save.md`, and in the
research notes that cite the original line numbers. Re-running it on every push was not producing
new answers; it was re-confirming answers already recorded, at the price of executing code from a
repository this project does not control, in a process that also runs the test suite.

Regression protection was the thing worth keeping, and it is kept in full. The fifteen recordings
remain and are all replayed against the modern engine on every run, which is more than was true
before: `npc-titled.json` had no consumer other than the oracle itself and is now an active golden.
The trait-table checks changed shape rather than disappearing. They used to diff `src/data/traits.ts`
against `pq-web-src/config.js`, and the obvious replacement — snapshotting `config.js` into a local
fixture and diffing against the copy — was rejected outright. That is a test comparing data to
itself; it can only pass. In its place is a structural golden that asserts every table's exact
entry count, the shape and typing of every entry, the sign and ordering of the quality ladders, and
the two duplicates that are deliberate. Those checks catch a table gaining or losing an entry,
which matters because the engine draws from these tables with `rng.pick` and `rng.random(length)`
and a length is therefore an argument to the PRNG.

What is genuinely lost is the ability to catch a changed spelling or a changed quality number in a
table entry, except where one of the fifteen recordings happens to reach it. Nothing in this
repository can recover that, and the docstring on the test says so rather than implying otherwise.
That loss is the price of the decision and it is smaller than it looks: those tables are stable
data that nothing in normal development has cause to edit, and the paths that do matter are still
owned in `.github/CODEOWNERS`.

The goldens cannot be re-recorded. That is the important operational consequence and it is stated
wherever someone might reach for a regeneration script: a golden produced by running this project's
own engine and saving the output asserts nothing at all. A failing golden is a question — did we
mean this? — and the answer belongs in the commit message of whoever changes the recorded value.
