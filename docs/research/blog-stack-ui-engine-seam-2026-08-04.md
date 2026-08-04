# Blog-stack comparison: UI/engine seam

Date: 2026-08-04
Source snapshots: `williamzujkowski.github.io` at [`7b84ba2`](https://github.com/williamzujkowski/williamzujkowski.github.io/tree/7b84ba2cbc41f5c3f8e973461f5a30d6479d4f62); Progress Quest II at [`2f240c3`](https://github.com/williamzujkowski/progress-quest-ii/tree/2f240c3de97f22c394604c994ae10d895b33be35).

## Decision

Progress Quest II already separates its UI from its game logic at the important seam. Keep the current Vite + React + Zustand stack. Do **not** port the game to the blog's Astro + Svelte stack: Astro's islands produce leverage for mostly-static documents, while Progress Quest II is one continuously interactive, persisted simulation. The likely Astro result would be one page containing one full-game client island—the same client application plus another framework and hydration lifecycle.

The useful adoption is smaller: make the existing engine/UI dependency direction executable with an architecture test, finish the already-filed before-first-paint theme work in [#126](https://github.com/williamzujkowski/progress-quest-ii/issues/126), and continue borrowing specific browser-test ideas rather than the blog's framework.

## Exact blog stack and shape

The blog is Astro 7.1 + Svelte 5.56 + strict TypeScript 6, built with pnpm. Pagefind supplies static search; Playwright and axe cover browser behavior and accessibility. Its manifest is the authoritative dependency list and names the stack directly. ([package manifest](https://github.com/williamzujkowski/williamzujkowski.github.io/blob/7b84ba2cbc41f5c3f8e973461f5a30d6479d4f62/astro-site/package.json#L1-L64), [strict TypeScript config](https://github.com/williamzujkowski/williamzujkowski.github.io/blob/7b84ba2cbc41f5c3f8e973461f5a30d6479d4f62/astro-site/tsconfig.json#L1-L10))

Its module shape is document-first:

- Astro pages and a shared `BaseLayout` render the static shell and most content. Only search and code-copy modules hydrate lazily. ([layout imports and client islands](https://github.com/williamzujkowski/williamzujkowski.github.io/blob/7b84ba2cbc41f5c3f8e973461f5a30d6479d4f62/astro-site/src/layouts/BaseLayout.astro#L1-L21), [island placement](https://github.com/williamzujkowski/williamzujkowski.github.io/blob/7b84ba2cbc41f5c3f8e973461f5a30d6479d4f62/astro-site/src/layouts/BaseLayout.astro#L251-L297))
- Even PizzaOps is a static Astro page whose interactive calculator is one `client:load` Svelte island. ([PizzaOps page](https://github.com/williamzujkowski/williamzujkowski.github.io/blob/7b84ba2cbc41f5c3f8e973461f5a30d6479d4f62/astro-site/src/pages/pizza-ops.astro#L1-L33))
- Markdown posts enter through a build-time content collection with a Zod schema. ([content collection](https://github.com/williamzujkowski/williamzujkowski.github.io/blob/7b84ba2cbc41f5c3f8e973461f5a30d6479d4f62/astro-site/src/content.config.ts#L1-L27))
- A pinned-action workflow builds static output and deploys `astro-site/dist` to GitHub Pages. A separate workflow builds and runs Playwright/axe. ([deployment](https://github.com/williamzujkowski/williamzujkowski.github.io/blob/7b84ba2cbc41f5c3f8e973461f5a30d6479d4f62/.github/workflows/deploy.yml#L1-L69), [browser/a11y gate](https://github.com/williamzujkowski/williamzujkowski.github.io/blob/7b84ba2cbc41f5c3f8e973461f5a30d6479d4f62/.github/workflows/a11y.yml#L42-L80))

That is an effective deep module split for a publishing site: Astro owns page generation and metadata; small Svelte adapters sit only at seams that need browser state.

## Existing Progress Quest II seam

Progress Quest II is a Vite 8 + React 19 client application. Zustand owns session state, Zod validates untrusted persistence, and Vitest/Playwright exercise engine, state, browser, and PWA contracts. ([package manifest](https://github.com/williamzujkowski/progress-quest-ii/blob/2f240c3de97f22c394604c994ae10d895b33be35/package.json#L1-L42))

The dependency direction is already the desired one:

```text
React UI modules
       |
       v
state/browser adapters (Zustand, clock, saves, diagnostics, audio)
       |
       v
pure engine modules <--- typed game data
```

Evidence:

- `src/engine/` imports only game data and sibling engine modules; it has no React, DOM, storage, or Zustand dependency. The transition module accepts state, elapsed time, and an injected random generator, then returns transition results and events. ([transition interface](https://github.com/williamzujkowski/progress-quest-ii/blob/2f240c3de97f22c394604c994ae10d895b33be35/src/engine/transition.ts#L1-L39), [`advanceGame` seam](https://github.com/williamzujkowski/progress-quest-ii/blob/2f240c3de97f22c394604c994ae10d895b33be35/src/engine/transition.ts#L173-L201), [simulation imports](https://github.com/williamzujkowski/progress-quest-ii/blob/2f240c3de97f22c394604c994ae10d895b33be35/src/engine/sim.ts#L1-L22))
- `gameStore` is the principal adapter at the engine/UI seam: it owns the session commands, invokes `advanceGame`, translates returned events, and atomically publishes new state to UI callers. ([store interface and imports](https://github.com/williamzujkowski/progress-quest-ii/blob/2f240c3de97f22c394604c994ae10d895b33be35/src/state/gameStore.ts#L1-L51), [tick adapter](https://github.com/williamzujkowski/progress-quest-ii/blob/2f240c3de97f22c394604c994ae10d895b33be35/src/state/gameStore.ts#L102-L115))
- `App` is a browser-shell module: it wires UI modules to the store, clock, checkpoint feedback, theme adapter, and modal state. It does not contain RPG transitions. ([application shell](https://github.com/williamzujkowski/progress-quest-ii/blob/2f240c3de97f22c394604c994ae10d895b33be35/src/App.tsx#L1-L107))
- The repository already documents `StartSessionRequest` as the single UI-to-state command and `restoreSession` as the full-session replacement seam. ([executable contract](https://github.com/williamzujkowski/progress-quest-ii/blob/2f240c3de97f22c394604c994ae10d895b33be35/docs/contracts/state-and-save.md#L43-L56))
- CI tests this shape at multiple depths: typecheck, unit/contract tests, production build, E2E, and PWA production tests all gate changes. ([CI workflow](https://github.com/williamzujkowski/progress-quest-ii/blob/2f240c3de97f22c394604c994ae10d895b33be35/.github/workflows/ci.yml#L33-L61))

Some UI modules directly call pure engine queries or creation helpers—for example, character creation rolls stats from an explicit seed before sending `StartSessionRequest`. ([character-creation adapter](https://github.com/williamzujkowski/progress-quest-ii/blob/2f240c3de97f22c394604c994ae10d895b33be35/src/components/CharacterCreatorModal.tsx#L1-L69)) This is dependency in the safe direction, not game logic implemented in the UI. Introducing pass-through selectors or a barrel solely to hide those calls would make a shallow module and reduce locality.

## Minimal adoption slices

1. **Enforce the existing seam (recommended next slice).** Add one dependency-direction test that scans engine imports and fails if `src/engine/` imports React, `src/components/`, `src/state/`, `src/pwa.ts`, or browser-only modules. Also reject browser globals in engine source. The current interface stays unchanged; the test turns architectural intent into an executable contract.
2. **Apply a persisted theme before first paint through existing #126.** Borrow the blog's tested idea, not its Astro implementation: a tiny CSP-compatible bootstrap must reuse Progress Quest II's existing theme identifiers and CSS variables. Preserve `theme.ts` as the authoritative module and test DOM-content-loaded behavior.
3. **Keep browser QA pattern-level, not framework-level.** Progress Quest II already has axe, forced-colors, 320 px overflow, dense desktop, theme, offline, and update tests. Add blog-derived cases only when they cover a concrete missing state; do not duplicate its whole suite.
4. **Profile before adding UI read-model modules.** Zustand callers currently select game state directly. A selector/read-model seam is justified only when profiling shows avoidable rerenders or when a second adapter needs the same projection. One adapter is not enough reason to invent a seam.

## Rejected copying

| Blog pattern | Decision | Reason |
|---|---|---|
| Astro page shell around the game | Reject | The simulation, roster, modals, logs, PWA notices, and theme controls all need shared live client state; the shell would gain almost no static surface. |
| React-to-Svelte rewrite | Reject | Changes implementation technology without moving the engine seam or reducing its interface. It increases regression surface for no gameplay or maintenance leverage. |
| Astro content collections for game tables | Reject | `src/data/` is already typed at compile time and consumed directly by the engine. A Markdown/Zod build pipeline would add another representation and weaken locality. |
| pnpm migration | Reject | Package-manager choice does not deepen a module; npm is already locked and exercised by CI/Pages. |
| Pagefind | Reject | Static document search has no current game user story. |
| Blog deploy workflow | Reject as a replacement | Progress Quest II's deploy gate is stricter because it includes fidelity, E2E, PWA, and audit checks before upload. |
| Blog theme implementation | Reuse concept only | The game already consumes `@williamzujkowski/oklch-terminal-themes`; copying blog-specific storage keys, classes, or Remarque CSS would create two authorities. |

## Risks and save compatibility

- An Astro/Svelte migration should be considered a core-stack change requiring a supermajority vote. It would risk duplicate clock startup, store recreation during hydration/navigation, checkpoint restore ordering, and service-worker asset changes.
- UI work must not change `characterSheetSchema`, checkpoint envelopes, storage keys, RNG continuation, or `StartSessionRequest` semantics. The architecture-test slice changes none of them and therefore has no save-format impact.
- The theme bootstrap in #126 must fail safely when storage is blocked, remain compatible with the existing CSP, and leave all saved characters/checkpoints untouched.
- Any future state-adapter split should preserve `advanceGame` as the engine test interface and validated state replacement as the persistence interface. Rewriting callers first would spread knowledge and reduce locality.

## Candidate issue wording

**Title:** `architecture: enforce the engine/UI dependency seam`

**Body:**

> Progress Quest II already has a pure `src/engine/` implementation and browser/state adapters above it, but the dependency direction is documented rather than mechanically enforced. Add the smallest executable architecture contract so a future UI change cannot pull React, Zustand, persistence, PWA, or browser globals into the engine.
>
> Acceptance criteria:
>
> - Add a focused test or existing-linter rule that scans every `src/engine/**/*.{ts,tsx}` file.
> - Fail on imports from React, `src/components/`, `src/state/`, `src/pwa.ts`, or other browser-only modules.
> - Fail on direct `window`, `document`, `localStorage`, `navigator`, `Audio`, or timer use in engine implementation; injected time/random dependencies remain allowed.
> - Keep current engine interfaces, production behavior, save schemas, storage keys, and RNG behavior unchanged.
> - Document the dependency direction next to the state/save contracts.
> - Verify with `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build`.
>
> Ponytail constraint: use an already-installed linter facility if it can express the rule cleanly; otherwise use one small Vitest contract. Do not add a dependency, barrel, interface wrapper, or pass-through module.

Related existing work: [#126](https://github.com/williamzujkowski/progress-quest-ii/issues/126) already tracks the only immediately useful blog-style runtime pattern: applying the persisted OKLCH theme before first paint.
