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

## Prime Directive & Development Disciplines

```
correctness > simplicity > performance > cleverness
```

- **Correctness**: Does the game logic accurately replicate Progress Quest mechanics? Are edge cases handled? Are state mutations predictable and tested?
- **Simplicity**: Can a developer or AI agent understand the code in 5 minutes?
- **Performance**: Does the game loop run smoothly off the main thread without memory leaks or UI jank?
- **Cleverness**: Never. Obfuscated trickery creates technical debt.

### Core Disciplines
- **Red/Green TDD** — Write a failing test first, then the minimum code to pass, then refactor. Never write production engine code without a corresponding test.
- **YAGNI (You Aren't Gonna Need It)** — Implement only what is required by a named feature or backlog issue. Avoid speculative abstractions, unused parameters, or "just in case" utility helpers.
- **DRY (Don't Repeat Yourself)** — Every piece of game data or logic (stat tables, item generation formulas, level curves) must have a single, unambiguous, authoritative representation in `src/data/` or `src/engine/`.
- **Zero `any` policy** — Strict TypeScript typing enforced. Use `unknown` + type guards or Zod schemas at external storage and string boundaries.

---

## Ponytail: Lazy Senior Dev Method (Radical Simplicity)

This codebase incorporates **Ponytail** (`https://github.com/dietrichgebert/ponytail`). Write only what the task needs: lazy means efficient, not careless. The best code is the code never written.

### The 7-Rung Decision Ladder
Before writing any code, stop at the first rung that holds:

1. **Does this need to exist at all?** (YAGNI) If speculative, skip it and state why in one line.
2. **Already in this codebase?** Reuse existing helpers, components, types, or utils. Don't rewrite what already lives here.
3. **Stdlib does it?** Use native TypeScript / ES standard library functionality.
4. **Native platform feature covers it?** Use native HTML5/CSS3 features (e.g. `<input type="date">`, CSS Grid/Flexbox, `localStorage`/`IndexedDB`).
5. **Already-installed dependency solves it?** Use `zustand`, `zod`, `lucide-react`. Never add a new dependency if a few lines of clean code can do it.
6. **Can it be one line?** Make it one line.
7. **Only then:** Write the minimum explicit, safe code that works.

### Root-Cause Bug Fixing & Ponytail Rules
- **Bug fix = root cause, not symptom:** Grep every caller of a function before editing. One guard in a shared function is smaller and safer than patching individual call paths.
- **No unrequested abstractions:** No single-implementation interfaces, no factories for one product, no unnecessary boilerplate.
- **Shortest working diff wins:** Deletion over addition. Boring over clever. Fewest files possible.
- **Ponytail comments:** Mark deliberate simplifications or trade-offs with a `ponytail:` comment describing the rationale and upgrade trigger (e.g. `// ponytail: simple O(n) scan, indexed map if item count > 1000`).
- **Never lazy about:** Understanding the problem (read the full context before editing), input validation at boundaries, error handling that prevents data loss, security, accessibility, or unit tests for non-trivial logic.

---

## Default Working Mode

For any non-trivial task (new features, architectural refactoring, UI redesign):

1. **Research** — Inspect `pq-web-src/` baseline files and existing codebase to ground implementation details in empirical evidence.
2. **Plan** — Outline the step-by-step implementation plan, listing files created/modified and target test cases.
3. **Implement** — Execute changes incrementally using TDD and the Ponytail 7-rung decision ladder.
4. **Verify** — Run lint, type-check, unit tests (`npm test`), and E2E build validation before concluding work.

---

## Context Budget & Q Protocol

Keep working context lean. Target token budgets: Minimal ~800 / Standard ~2,500 / Research ~1,500 / Full ~6,000. Reference files by path instead of inlining large text blocks.

Before any uncertain operation or major state mutation, follow the **Q Protocol**:

```
DOING:   [action]
EXPECT:  [expected outcome]
IF YES:  [next step]
IF NO:   [fallback or fix]
```

After the operation, close the loop: `RESULT … MATCHES yes/no … THEREFORE …`.

---

## Canonical Paths & Project Layout

Always follow this layout — do not create duplicate or parallel module structures:

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

- [ ] **Ponytail & TDD/YAGNI/DRY verified** — 7-rung ladder checked, tests written, zero speculative code, zero duplicated logic.
- [ ] **Strict Typing** — Zero TypeScript errors (`npx tsc --noEmit`), zero `any` usage, all storage inputs validated via Zod.
- [ ] **Engine Isolation** — Game logic in `src/engine/` remains 100% decoupled from DOM/React rendering.
- [ ] **Wiring Complete** — New components, state actions, and type definitions properly exported and connected.
- [ ] **Tests Pass** — `npm test` runs clean with full coverage on happy paths, edge cases, and failure modes.

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

## Skills Library

Workflow playbooks live in `.agents/skills/<name>/SKILL.md` (conforming to the Anthropic Agent Skills specification). When a task matches a skill's intent, read its `SKILL.md` and follow its instructions:

- **`ponytail`**: Lazy senior dev mode. Enforces the 7-rung decision ladder (YAGNI → reuse → stdlib → native platform → installed dep → 1 line → minimal safe code).
- **`code-review`**: Standardized code review checklist and architectural review before merging PRs.
- **`codebase-design`**: Designing modular components, interface boundaries, and data flow.
- **`diagnosing-bugs`**: Root-cause bug investigation and failure trace analysis.
- **`domain-modeling`**: Modeling RPG domain entities, stats, equipment, items, and state contracts.
- **`grill-me` / `grilling`**: Interactive requirements grilling to resolve ambiguous user requirements.
- **`grill-with-docs`**: Grilling requirements against official project documentation and ADRs.
- **`handoff`**: Context packaging and handoff state summary between agent turns or subagents.
- **`implement`**: Feature implementation workflow following red/green TDD.
- **`improve-codebase-architecture`**: Refactoring legacy structures, decoupling dependencies, and reducing technical debt.
- **`prototype`**: Rapid feature prototyping and spikes.
- **`research`**: Evidence-based codebase research and synthesis.
- **`resolving-merge-conflicts`**: Safe Git merge conflict resolution.
- **`tdd`**: Test-driven development loop (`red → green → refactor`).
- **`teach`**: Explaining technical decisions, architectures, and codebase mechanics.
- **`to-spec`**: Converting raw feature requests into technical specifications.
- **`to-tickets`**: Decomposing epics/specs into scoped GitHub issues.
- **`triage`**: Issue classification and prioritization.
- **`wayfinder`**: Codebase discovery, sitemap generation, and entrypoint navigation.
- **`writing-great-skills`**: Creating or updating agent skills in `.agents/skills/`.

---

## Periodic QA, Security & Architecture Reviews

Agents working in this codebase MUST perform periodic checks to maintain high code quality and accuracy:
- **Code & Security Reviews (`code-review` / `diagnosing-bugs`)**: Before submitting a PR or merging major features, run a code and security audit verifying type safety, error boundaries, and input validation.
- **Architecture & Vestigial Code Audits (`improve-codebase-architecture`)**: Periodically inspect module boundaries and remove deprecated, unused, or vestigial code.
- **Accuracy Verification (`to-spec` / `domain-modeling`)**: Verify game formulas and data structures against the canonical `pq-web-src/` baseline.

---

## Issue Creation & Tracking Policy

Every piece of identified follow-up work — including feature ideas, discovered bugs, scope cuts, or deferred refactors — MUST be tracked explicitly by creating a **GitHub Issue** (`gh issue create`).

- **Ideas & Enhancements**: Immediately file an issue when discovering opportunities for UI polish, game features, or performance gains.
- **Discovered Bugs**: File an issue detailing root-cause hypothesis and reproduction steps.
- **No Untracked Work**: Memory notes, PR bullets, or code TODOs are NOT official tracking. If a task isn't in a GitHub issue, it gets dropped.

---

## Branch & Pull Request Workflow

1. **Feature Branches**: All non-trivial work MUST be done on a dedicated branch (e.g. `feat/game-state-machine`, `feat/save-system`, `fix/encumbrance-calc`).
2. **Pull Requests**: Submit PRs via `gh pr create` with clear titles, descriptions, and linked issue numbers.
3. **Verification**: Run `npm test` and `npx tsc --noEmit` before opening or merging any PR.


