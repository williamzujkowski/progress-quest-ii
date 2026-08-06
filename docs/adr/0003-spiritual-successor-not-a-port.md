# A spiritual successor, not a port

This project is inspired by Progress Quest. It is no longer trying to reproduce it. The goal is
a game for people who want to play games without playing them and watch numbers go up, and where
that goal and exact legacy behaviour disagree, the goal wins.

`AGENTS.md` previously said the project retained "100% of the original game's iconic mechanics,
flavor text, humor, and deterministic progression logic." That was false in at least two places
already, and had been for some time. Character creation applies race and class stat bonuses the
original never applied — the legacy tables carry a `|STAT` suffix, but `newguy.js:70` reads it
only to extract a display name and `RollEm()` never touches races or classes at all. Character
creation also draws six random numbers where the original drew two, using `3d6 + 2` for HP and MP
where the original used `Random(8) + CON.div(6)`, which is a different distribution and one that
is not coupled to a prime stat. Separately, the engine resolves loot between an interplot
cinematic's opening and its remainder where the original resolved it outside the cinematic
entirely.

None of those are being reverted. They are additions and refinements a successor is allowed to
make, and the first of them makes race and class choices mean something mechanically, which the
original deliberately never did and which this project is happy to do. What is being retired is
the claim of parity, because a documented promise that the code does not keep is worse than an
honest divergence: it invites contributors to "fix" intentional behaviour, and it made every
fidelity finding read as a defect report rather than a design question.

The legacy source in `pq-web-src/` keeps its job, with a smaller title. It remains the
behavioural reference for anything this project has not deliberately changed, and the oracle
harness in `scripts/legacy-oracle.mjs` remains valuable precisely because it catches *unintended*
drift — the kind that arrives through a refactor nobody meant as a design decision. A parity test
failing is now a question ("did we mean to change this?") rather than an automatic bug. It is not
permission to stop running them; an unexplained divergence is still far more likely to be a
mistake than a choice.

Practically: divergences that are deliberate get recorded, in an ADR when they change how the
game plays and in a comment when they are local. Divergences nobody can explain get treated as
bugs until someone explains them. Save compatibility, storage keys, and `.pqw` terminology are
unaffected by this decision and remain governed by `docs/contracts/state-and-save.md`.

This supersedes the parity language in `AGENTS.md`. It does not supersede
`docs/adr/0002-rename-to-progress-quest-iii.md`, which remains the naming decision and is
independent of it.
