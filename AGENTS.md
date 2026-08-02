# AGENTS.md — progquest

Standalone guidance for AI coding agents (OpenCode, Codex CLI, Cursor, Aider, Cline, Continue, Goose, Claude Code) working in this repository. Self-contained — single source of truth for agent guidance in this project.

**About this project:** `progquest` is the modern web implementation of Eric Fredricksen's classic zero-player RPG *Progress Quest* (web edition). The goal of this project is to modernize the legacy 2000s JavaScript / jQuery codebase into a clean, modular, responsive, high-performance web application while retaining 100% of the original game's iconic mechanics, flavor text, humor, and deterministic progression logic.

---

## Mission

Build and maintain a modern, fully-typed, responsive, and tested web application for **Progress Quest**.

- **Reference Baseline:** `pq-web-src/` contains the legacy JavaScript/HTML source (`main.js`, `config.js`, `newguy.js`, `roster.js`, `sim.js`, `cheat.js`, `clock.js`, `main.css`, `progros.css`). It serves as the authoritative functional reference.
- **Modernization Goals:**
  1. **Strict TypeScript & Modular Engine:** Decouple core game simulation logic (`src/engine/`) from UI rendering (`src/components/`). Zero UI dependencies in engine code.
  2. **Modern Web UI & Design System:** Implement a responsive visual design system (supporting retro ProgrOS / Windows classic themes alongside sleek modern dark/light modes) with smooth animations and progress bars.
  3. **Robust State & Save Management:** Implement safe local storage (IndexedDB/LocalStorage) with Zod schema validation, base64 save import/export compatibility, and multi-character roster support.
  4. **Comprehensive Test Suite:** Unit-test all RPG math curves, stat rolling, inventory encumbrance, and quest generation logic via Vitest, backed by Playwright end-to-end browser tests.
  5. **Offline & PWA Support:** Web App Manifest and Service Worker support for offline play on mobile and desktop.

---

## Prime Directive

```
correctness > simplicity > performance > cleverness
```

- **Correctness**: Does the game logic accurately replicate Progress Quest mechanics? Are edge cases handled? Are state mutations predictable and tested?
- **Simplicity**: Can a developer or AI agent understand the code in 5 minutes?
- **Performance**: Does the game loop run smoothly off the main thread without memory leaks or UI jank?
- **Cleverness**: Never. Obfuscated trickery creates technical debt.

Produce software with explicit error handling, observable state changes, and no silent failures.

---

## Development Disciplines

- **Red/Green TDD** — Write a failing test first, then the minimum code to pass, then refactor. Never write production engine code without a corresponding test.
- **YAGNI (You Aren't Gonna Need It)** — Implement only what is required by a named feature or backlog issue. Avoid speculative abstractions, unused parameters, or "just in case" utility helpers.
- **DRY (Don't Repeat Yourself)** — Every piece of game data or logic (stat tables, item generation formulas, level curves) must have a single, unambiguous, authoritative representation in `src/data/` or `src/engine/`.
- **Zero `any` policy** — Strict TypeScript typing enforced. Use `unknown` + type guards or Zod schemas at external storage and string boundaries.

---

## Default Working Mode

For any non-trivial task (new features, architectural refactoring, UI redesign):

1. **Research** — Inspect `pq-web-src/` baseline files and existing codebase to ground implementation details in empirical evidence.
2. **Plan** — Outline the step-by-step implementation plan, listing files created/modified and target test cases.
3. **Implement** — Execute changes incrementally using TDD.
4. **Verify** — Run lint, type-check, unit tests, and E2E build validation before concluding work.

### Subagent Delegation & Fan-Out

- Delegate wide exploration, multi-file audits, or parallel investigations to read-only subagents.
- For architectural choices or trade-offs, evaluate alternatives explicitly before committing.
- Keep main conversation context lean by summarizing subagent findings into concise action points.

---

## Context Budget

Keep working context lean. Target token budgets: Minimal ~800 / Standard ~2,500 / Research ~1,500 / Full ~6,000. Reference files by absolute or relative path instead of inlining large text blocks. Summarize multi-step results into clear bullet points.

---

## Error Handling & Q Protocol

Before any uncertain operation or major state mutation, follow the **Q Protocol**:

```
DOING:   [action]
EXPECT:  [expected outcome]
IF YES:  [next step]
IF NO:   [fallback or fix]
```

After the operation, close the loop: `RESULT … MATCHES yes/no … THEREFORE …`.

**On failure:** (1) state the raw error, (2) state the suspected cause, (3) propose ONE concrete fix, (4) state expected outcome. Never guess past a failing build or test.

---

## Canonical Paths & Project Layout

Do not create duplicate or parallel module structures. Always follow this layout:

| Layer | Canonical Location | Description |
| :--- | :--- | :--- |
| **Legacy Baseline** | `pq-web-src/` | Original web JS/HTML/CSS implementation (Read-only reference). |
| **Game Engine** | `src/engine/` | Pure JS/TS game logic: tick clock, character stats, inventory, quest generator, equipment, monster encounters, EXP & leveling curves. Zero UI dependencies. |
| **Game Data & Config** | `src/data/` | Data tables for races, classes, traits, spell names, equipment prefixes/suffixes, quest templates (`config.js` port). |
| **State & Storage** | `src/state/` | Game loop state machine, character store, save game serialization/deserialization, LocalStorage/IndexedDB persistence. |
| **UI Components** | `src/components/` | Modular UI components (`CharacterSheet`, `QuestLog`, `PlotBar`, `InventoryList`, `EquipmentView`, `Roster`, `CharacterCreator`). |
| **Styles & Assets** | `src/assets/` | Modern & retro CSS styles, ProgrOS theme, images, sound effects. |
| **Tests** | `src/__tests__/` | Unit tests for engine math/RNG, state persistence integration, and Playwright E2E browser tests. |

---

## Self-Check Quality Gate

Before completing ANY task:

- [ ] **TDD/YAGNI/DRY verified** — tests written, zero speculative code, zero duplicated logic.
- [ ] **Strict Typing** — Zero TypeScript errors, zero `any` usage, all storage inputs validated via Zod.
- [ ] **Engine Isolation** — Game logic in `src/engine/` remains 100% decoupled from DOM/React rendering.
- [ ] **Wiring Complete** — New components, state actions, and type definitions properly exported and connected.
- [ ] **Tests Pass** — `npm test` (or `pnpm test`) runs clean with full coverage on happy paths, edge cases, and failure modes.

---

## Untrusted-Input Safety Invariants

When ingesting external data (base64 `.pqw` save strings, custom JSON character files, user inputs):

1. **Sanitize & Validate:** All external inputs MUST pass through Zod schema validation before hitting application state.
2. **Fail Closed:** On malformed save data or parse failures, reject safely with human-readable error feedback. Never mutate state with partial or unvalidated payloads.

---

## Consensus Voting Thresholds

When evaluating major design or architectural forks:

| Trigger | Threshold |
| :--- | :--- |
| Core Architecture / Tech Stack Changes | Supermajority |
| Breaking Save File / Serialization Changes | Unanimous |
| Security & Storage Input Handling | Supermajority |
| UI Design & Feature Prioritization | Majority |

---

## Track All Work

Every piece of identified follow-up work — including scope cuts, deferred migrations, or unblocked dependencies — must be tracked explicitly via GitHub issues or dedicated task tracking. Never rely on temporary memory or code comments for long-term task tracking.
