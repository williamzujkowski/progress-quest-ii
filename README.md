# Progress Quest

Progress Quest is a modern web edition of Eric Fredricksen's classic zero-player RPG: create an adventurer, point them toward danger, and observe the consequences while pretending you are in charge.

## Visit the live game

Open the [Progress Quest GitHub Pages site](https://williamzujkowski.github.io/progquest/) in a current desktop or mobile browser.

The intended player story is pleasantly hands-off:

1. Visit the site. No account, launcher, or solemn oath is required.
2. Choose **New Character**, roll a name and stats, and accept the results before the dice start asking questions.
3. Watch the hero banner, quest progress, activity log, equipment, spells, and loot update themselves.
4. Hover or keyboard-focus equipment, loot, and spells for a compact tooltip with the item's dry commentary and the mechanics the engine actually exposes.
5. Change the OKLCH terminal theme if the default darkness is not sufficiently dramatic.
6. Leave the tab open. Your hero will continue making brave, statistically questionable decisions.

The dashboard is responsive at phone widths and keeps growing activity, inventory, and loadout content inside bounded scrolling regions instead of extending the page into the next geological era.

### PWA status, without the marketing fog

The live site is a fast static web app deployed over HTTPS to GitHub Pages, with validated local saves. Full installable/offline PWA behavior—manifest, service worker, update handling, and offline end-to-end coverage—is planned in the [modernization roadmap](./docs/modernization-roadmap.md), but is not shipped yet. Your browser may offer an install prompt anyway; that is not evidence that offline play works, merely evidence that browsers are optimistic.

## What is in the box

- Deterministic, zero-player progression based on the legacy game behavior.
- Character creation, roster/save import and export, quests, combat progression, equipment, spells, loot, and activity history.
- Responsive desktop and mobile layouts with bounded scrolling panels.
- Remarque Dark, Remarque Light, and legacy ProgrOS themes powered by [`@williamzujkowski/oklch-terminal-themes`](https://github.com/williamzujkowski/oklch-terminal-themes).
- Accessible keyboard paths, tooltip descriptions, local validation, and fail-closed save imports.
- A Playwright browser suite covering dense dashboards, mobile widths, themes, accessibility, saves, and creator flows.

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
npm audit --audit-level=high
```

Agent workflow checks are also available:

```sh
npm run agents:verify
npm run agents:review
```

## Architecture at a glance

- `src/engine/` — pure game simulation and math; no DOM, React, or browser storage.
- `src/data/` — authoritative game tables and item/spell descriptions.
- `src/state/` — session, persistence, and validated save boundaries.
- `src/components/` — React game surfaces and interaction modules.
- `src/__tests__/` — Vitest unit, fidelity, and state contracts.
- `e2e/` — Playwright browser and responsive behavior tests.
- `pq-web-src/` — read-only legacy reference implementation and behavior oracle.
- `.agents/skills/` — repository workflow and review skills.

See [`AGENTS.md`](./AGENTS.md) for the project’s correctness, TDD, typing, security, issue, and pull-request rules. It is less funny than this README because it has to be trusted with production code.

## Design and standards notes

The interface uses dense terminal-inspired composition, OKLCH semantic tokens, explicit overflow regions, and accessible focus states. Research notes, contracts, and the modernization backlog live in [`docs/`](./docs/).

The legacy baseline in `pq-web-src/` is the functional reference, not a museum exhibit to be casually “cleaned up.” Changes to progression, serialization, or compatibility require tests and explicit review.
