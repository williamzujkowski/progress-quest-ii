# Progress Quest

A modern, fully typed web edition of Eric Fredricksen's classic zero-player RPG. The React UI presents the original game's deterministic progression as a responsive operations dashboard while `pq-web-src/` remains the functional reference baseline.

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Quality gates:

```sh
npm test
npm run lint
npm run build
npm run test:e2e
```

## Theme system

The primary Remarque Dark and Remarque Light palettes come directly from [`@williamzujkowski/oklch-terminal-themes`](https://github.com/williamzujkowski/oklch-terminal-themes). `src/theme.ts` validates the stored theme identifier, applies the selected palette, and persists the choice; `src/index.css` maps the package's `--terminal-*` slots to application-level semantic tokens. The legacy ProgrOS palette remains available from the theme selector.

The interface borrows the upstream showcase's dense dashboard composition: restrained surfaces, compact status readouts, terminal typography, semantic ANSI colors, and overflow-safe responsive grids.

## Repository map

- `src/engine/` — pure game simulation and math
- `src/data/` — authoritative game data
- `src/state/` — session and save boundaries
- `src/components/` — React game surfaces
- `src/__tests__/` — Vitest unit and integration tests
- `e2e/` — Playwright browser tests
- `pq-web-src/` — read-only legacy reference implementation
- `.agents/skills/` — repository workflow and review skills

See [`AGENTS.md`](./AGENTS.md) for coding standards, TDD rules, security invariants, and the issue/PR workflow.
