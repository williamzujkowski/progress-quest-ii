# Progress Quest II

> **Zero players. Zero developers. Progress continues regardless.**

The sequel nobody had to play. First, humans wrote a game that played itself. Then computers helped rebuild the game. The circle is complete, the paperwork has been misplaced, and nobody has had to play anything.

**Progress Quest II** is an unofficial spiritual successor to Eric Fredricksen's classic zero-player RPG *Progress Quest* — for people who want to play games without playing them and watch numbers go up. Inspired by the original rather than a port of it: it keeps the humour and the hands-off progression, and extends the mechanics where that makes the watching better. Created by humans. Rebuilt by machines. Played by nobody.

## Visit the live game

Open the [Progress Quest II GitHub Pages site](https://williamzujkowski.github.io/progress-quest-ii/) in a current desktop or mobile browser.

The intended player story is pleasantly hands-off:

1. Visit the site. No account, launcher, or solemn oath is required.
2. If no resumable adventurer exists, the required **New Character** screen opens itself. Roll a name and stats, then accept the results before the dice start asking questions.
3. Watch the hero banner, quest progress, activity log, equipment, spells, and loot update themselves.
4. Hover or keyboard-focus equipment, loot, and spells for a compact tooltip with the item's dry commentary and the mechanics the engine actually exposes.
5. Change the OKLCH terminal theme if the default darkness is not sufficiently dramatic.
6. Leave the tab open—or return later. The active session saves automatically and resumes before the machinery starts making brave, statistically questionable decisions on your behalf.

The dashboard is responsive at phone widths and keeps growing activity, inventory, and loadout content inside bounded scrolling regions instead of extending the page into the next geological era.

### PWA status, without the marketing fog

The live site is an installable PWA deployed over HTTPS to GitHub Pages. After one successful online visit, the current app shell starts offline while validated characters remain in browser storage and the active adventure resumes from a bounded deterministic checkpoint. When an open session discovers a new build, it offers an explicit **Update now** action; browsers may also activate a waiting worker naturally after every controlled tab closes. A failed install leaves the previous offline shell in office.

If a cached shell ever becomes impressively confused, use the browser's site settings to clear data or unregister the service worker, then revisit the site online. This removes browser-local characters too, so export any valued `.pqw` files first. Nothing is uploaded during this administrative ceremony.

## What is in the box

- Deterministic, zero-player progression based on the legacy game behavior.
- Character creation, deterministic session resume, roster/save import and export, quests, combat progression, equipment, spells, loot, and activity history.
- Time credited for a session spent closed, and a line on return saying what the backlog produced.
- Projections that stay quiet until they can be trusted: a rate of filing, and how long the next
  level and the current act are expected to take, measured rather than assumed.
- A world console that names where the hero is, what the place has an office for, who turned up
  to the raid, and what the archive makes of whoever they are currently fighting.
- Records kept in the institution's own filing cabinet: personal bests, the best equipment ever
  held per slot, a tally of casework by kind, the closed-quest archive, and a count of every
  distinct specimen ever acquired.
- Simulated chatter from a fictional cast, generated locally and sent nowhere. Nobody is online.
- Responsive desktop and mobile layouts with bounded scrolling panels, and records folded behind
  native disclosures so the live numbers keep the room.
- Remarque Dark/Light, Green Phosphor CRT, color-vision-safe Ocean Sunset HC, and legacy ProgrOS themes powered by [`@williamzujkowski/oklch-terminal-themes`](https://github.com/williamzujkowski/oklch-terminal-themes).
- Accessible keyboard paths, tooltip descriptions, local validation, and fail-closed save imports.
- Playwright suites across desktop Chromium, WebKit, and a mobile profile, covering dense
  dashboards, mobile widths, per-theme contrast measured directly, WCAG 2.2 target size and text
  spacing, saves, creator flows, installation, offline restart, explicit updates, rollback, and
  cache privacy.

Nothing on any of those surfaces asserts a mechanic the engine does not model. Equipment, spells,
and loot have no combat contribution at any quality, and the copy says so where it matters.

Existing `.pqw` saves and locally stored rosters remain compatible. The Roman numeral is branding, not an excuse to confiscate anybody's Hob-Hobbit.

## Local development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Then open the local URL printed by Vite. The local app is the same game, only with fewer strangers wandering past the console.

### Quality gates

Run the same checks used by CI before opening a pull request:

```sh
npx playwright install chromium
npm run quality
```

The quality command fails on modern-code or GitHub Actions workflow findings and
runs Nexus installation verification, lint, typecheck, unit and legacy-oracle
tests under enforced coverage floors, dependency audit at moderate severity plus registry signature
verification, browser E2E, and production PWA tests. The production build is not
a separate step - it runs inside the PWA suite, which is last, so browser E2E
exercises the dev server and only the PWA suite exercises the shipped bundle. Workflow lint uses the official actionlint v1.7.12 archive
for the current platform, verifies its pinned release checksum before every
extraction, and keeps the archive under ignored `node_modules/.cache/`. The
launcher uses the standard `tar` executable included on supported developer
systems and GitHub-hosted runners; ShellCheck and Pyflakes remain optional. The
read-only `pq-web-src/` behavior oracle is excluded from modern lint and remains
available separately through `npm run lint:legacy`.

Adapter-backed Nexus review, routing, and voting are temporarily bypassed because exhausted providers can produce zero-token heuristic results. Claude subagents and the repository review skills are the interim review path; see upstream [#4350](https://github.com/nexus-substrate/nexus-agents/issues/4350) and [#4351](https://github.com/nexus-substrate/nexus-agents/issues/4351). As of 2026-08-04 Claude is the only routable adapter: Codex is quota-exhausted, and Gemini's replacement CLI `agy` has no adapter in nexus-agents 2.173.6, so `doctor`'s per-adapter `Capacity: 100% remaining` is a static placeholder rather than a live quota reading. Nexus's generic quality tool also assumes ESLint and pnpm instead of repository scripts; the canonical local and CI gate is `npm run quality` until upstream [#4355](https://github.com/nexus-substrate/nexus-agents/issues/4355) is fixed. The workflow-checker provenance decision and immutable-SHA input-validation limitation are recorded in [the workflow lint research note](docs/research/github-actions-workflow-lint-2026-08-04.md).

## Architecture at a glance

- `src/engine/` — pure game simulation and math; no DOM, React, or browser storage.
- `src/data/` — authoritative game tables and item/spell descriptions.
- `src/state/` — session, persistence, and validated save boundaries.
- `src/components/` — React game surfaces and interaction modules.
- `src/__tests__/` — Vitest unit, fidelity, and state contracts.
- `e2e/` — Playwright browser and responsive behavior tests.
- `e2e-pwa/` — production-build install, offline, update, rollback, and cache-safety tests.
- `pq-web-src/` — read-only legacy reference implementation and behavior oracle.
- `.agents/skills/` — repository workflow and review skills.

See [`AGENTS.md`](./AGENTS.md) for the project’s correctness, TDD, typing, security, issue, and pull-request rules. It is less funny than this README because it has to be trusted with production code.

## Design and standards notes

The interface uses dense terminal-inspired composition, OKLCH semantic tokens, explicit overflow regions, and accessible focus states. Project copy follows the [editorial voice contract](docs/contracts/editorial-voice.md); research notes, other contracts, and the modernization backlog live in [`docs/`](./docs/).

The legacy baseline in `pq-web-src/` is the functional reference, not a museum exhibit to be casually “cleaned up.” Changes to progression, serialization, or compatibility require tests and explicit review.

## Credits and rights

Eric Fredricksen is the original creator of *Progress Quest* and principal author of the retained web reference implementation, which also includes repository contributors and third-party material attributed in the project notices. This repository is an unofficial modernization directed and reviewed by William Zujkowski with AI-assisted research, implementation, and testing. “Zero developers” is the joke; these authorship and provenance statements are not.

The root MIT license covers only material the project has authority to license under MIT. Classic implementation, names, tables, prose, the `pq-web-src/` submodule, bundled fonts, icons, and other dependencies retain their own rights and terms. The official Progress Quest site publishes a permissive license for Progress Quest, while the web-port source also contains conflicting “all rights reserved” headers; the project does not claim that this documentation resolves that ambiguity.

See the [content provenance inventory](docs/content-provenance.md) and [third-party notices](public/THIRD_PARTY_NOTICES.txt) before reusing game data, legacy code, prose, or assets. No code or assets from prior unofficial sequel projects have been imported.
