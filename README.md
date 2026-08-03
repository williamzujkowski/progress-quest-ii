# Progress Quest II

> The sequel nobody had to play.

First, humans wrote a game that played itself. Then computers helped rebuild the game. The circle is complete, the paperwork has been misplaced, and nobody has had to play anything.

**Progress Quest II** is an unofficial modern continuation of Eric Fredricksen's classic zero-player RPG *Progress Quest*. Created by humans. Rebuilt by machines. Played by nobody.

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
- Responsive desktop and mobile layouts with bounded scrolling panels.
- Remarque Dark/Light, Green Phosphor CRT, color-vision-safe Ocean Sunset HC, and legacy ProgrOS themes powered by [`@williamzujkowski/oklch-terminal-themes`](https://github.com/williamzujkowski/oklch-terminal-themes).
- Accessible keyboard paths, tooltip descriptions, local validation, and fail-closed save imports.
- Playwright browser suites covering dense dashboards, mobile widths, themes, accessibility, saves, creator flows, installation, offline restart, explicit updates, rollback, and cache privacy.

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
npm test
npm run lint
npx tsc -b
npm run build
npm run test:e2e
npm run test:pwa
npm audit --audit-level=high
```

The deterministic Nexus installation check is also available:

```sh
npm run agents:verify
```

Adapter-backed Nexus review, routing, and voting are temporarily bypassed because exhausted providers can produce zero-token heuristic results. Codex subagents and the repository review skills are the interim review path; see upstream [#4350](https://github.com/nexus-substrate/nexus-agents/issues/4350) and [#4351](https://github.com/nexus-substrate/nexus-agents/issues/4351).

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

The interface uses dense terminal-inspired composition, OKLCH semantic tokens, explicit overflow regions, and accessible focus states. Research notes, contracts, and the modernization backlog live in [`docs/`](./docs/).

The legacy baseline in `pq-web-src/` is the functional reference, not a museum exhibit to be casually “cleaned up.” Changes to progression, serialization, or compatibility require tests and explicit review.
