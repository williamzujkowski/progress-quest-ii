# Transition goldens

Every `.json` file here, including those under `monster-tasks/`, records one completed task as the
original Progress Quest web build resolved it. `input` is the sheet going in; `expected` is what
came out.

These were captured, not written. The web source used to sit in this repository as a submodule,
and a harness re-ran every fixture through the real implementation on each `npm test`, twice, and
required the two runs and the recorded `expected` to agree. That is where the values came from and
it is why they can be trusted as a baseline rather than as a copy of this project's own output.

That submodule is gone. The project is a spiritual successor and no longer executes third-party
code to check itself, so the round trip that produced these files cannot be repeated here. What
remains is the ordinary golden-master arrangement: `src/__tests__/goldens/transitionParity.test.ts`
replays each `input` through this engine and compares the result to the recorded `expected` on the
surface the two builds are meant to share.

Read a failure as a question first. A recorded value changing is a decision about how this game
behaves, and it belongs in the commit message of whoever changes it. A recorded value changing
because a refactor moved something nobody meant to move is the drift these files exist to catch,
and the two are only distinguishable if the deliberate ones are explained.

Do not add a fixture by running this project's engine and saving what it printed. There is no
longer anything here that would notice, and a golden generated from the code it is meant to check
asserts nothing at all.
