# Split the WebKit suite onto its own runner

Status: accepted
Decision date: 2026-08-08

## Context

The `quality` job ran every check in one serial script, ending with a Playwright suite across three
projects. WebKit dominated it.

Measured on the same machine, same suite:

| project | summed test time | wall clock |
| --- | ---: | ---: |
| chromium | 320s | 26s |
| webkit | 1213s | 156s |

Roughly 4x, with a per-test median of 3.4x and a worst case of 11.6x. The issue that raised this
estimated 2x, which was wrong, and proposed three explanations. Two are now refuted:

- **Serving a production build instead of the dev server.** Not available. The suite makes 30
  runtime `import('/src/…')` calls, and those paths exist only while a dev server is serving the
  source tree. Every seeding helper would have to be rewritten, and the result could no longer
  reach into the store to set up its own fixtures.
- **The axe accessibility scans.** Split by whether a test calls `expectNoViolations`: tests that
  do run 4.2x slower under WebKit, tests that do not run 4.3x slower. Identical. The scans cost
  real time in absolute terms — 225s of WebKit's 1213s — but explain none of the gap. Trimming
  them would shave both engines proportionally and leave the outlier exactly where it is.

What remains is a penalty spread evenly across the suite with no cluster, which is what uniform
driver and engine cost looks like rather than a slow feature. There is nothing to optimise: no
single test, fixture, or helper whose repair moves the number.

Parallelism offers nothing either. WebKit already reaches 7.8x effective parallelism against its
eight local workers, and CI pins four workers against a four-vCPU runner — one per core, with the
dev server competing.

## Decision

Run WebKit as its own CI job, `browser-parity`, on its own runner.

`quality` keeps everything else, including the chromium and mobile-chrome projects, and now
installs only chromium. `npm run quality:full` runs both locally for anyone who wants the complete
gate in one command.

## Consequences

The gate returns in roughly chromium time instead of waiting behind WebKit. Total compute is
unchanged — this moves work off the critical path rather than removing it.

**Coverage is unchanged, which is the reason this option was chosen over the alternatives.** The
other candidates were to accept the wait, or to run WebKit against a subset of the suite. The
second is the largest available saving and the only one that costs real coverage, and WebKit
coverage is not decorative: it caught unstyled controls inheriting the platform button face at
1.81:1, and tooltips accumulating because WebKit does not focus a button on tap. Neither was
visible to Chromium. Trading that for eight minutes would have been a bad exchange.

Two jobs now install dependencies where one did, so runner minutes rise even as wall clock falls.
That is the trade being made deliberately.

A failure now names which engine failed before anyone opens the log, which the combined job did
not.

## Correction, made immediately after

The first version of this split broke the merge gate, and the ADR should record that rather than
present the result as though it arrived clean.

Branch protection requires exactly one status check by name: `quality`. Moving WebKit into
`browser-parity` meant that name no longer covered it, so a pull request could go green and merge
with WebKit failing — impossible while both ran in one job. Splitting the work silently narrowed
what the gate asserted, and nothing in the change said so.

The repair keeps `quality` as the required name and makes it a job that does no work, fanning in
from `checks` and `browser-parity` via `needs`. It fails if either fails, so the protection rule
keeps meaning "everything passed" without having to name what everything is — and adding a job
later does not silently fall outside the gate the way this one did.

The alternative was to widen the protection rule to list both contexts. That needs a settings
change, and it has to be edited by hand every time a job is added or renamed, which is the same
failure with a longer fuse.

The fan-in job runs unconditionally and reads each dependency's result, rather than relying on
`needs` to stop it. A job whose dependency fails is *skipped* rather than failed, and whether a
skipped required check blocks a merge is not consistent enough to rest a merge gate on. Asserting
the results explicitly turns that ambiguity into a definite failure. This is the same defect as the
one above, one layer down: a control that looks correct because the passing path was the only one
exercised.
