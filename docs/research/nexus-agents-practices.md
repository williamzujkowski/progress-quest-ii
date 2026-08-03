# Nexus Agents practices for ProgQuest

Research date: 2026-08-02  
Installed package reviewed: `nexus-agents@2.173.6`  
Official source reviewed: tag commit [`94090768`](https://github.com/nexus-substrate/nexus-agents/tree/94090768e54f783667920741103e05542d443644) and current `main` commit [`3bbb5dad`](https://github.com/nexus-substrate/nexus-agents/tree/3bbb5dadcd26f1614cf3da66df8e83e8da7e05ef)

## Conclusion

ProgQuest should borrow Nexus Agents' **boundary discipline**, not its control-plane architecture. The useful contract is a small, explicit type at a real module seam, backed by runtime validation where data is untrusted and by tests that cover both success and failure. The game does not need an interface hierarchy, event bus, audit chain, agent router, or general-purpose framework.

The highest-value near-term work is:

1. make the character schema the canonical save contract and infer its TypeScript type;
2. keep one discriminated `startSession` command for creation, import, and roster entry;
3. make save decoding and storage failures honest, typed outcomes at the UI boundary;
4. remove `any` from the PRNG seed contract and make the clock/seed fallback injectable only where reproducibility needs it;
5. add contract tests and executable CI gates for those seams.

## Existing ProgQuest baseline

ProgQuest already has the right broad architecture: pure game logic under [`src/engine/`](../../src/engine/), state and persistence under [`src/state/`](../../src/state/), and UI callers under [`src/components/`](../../src/components/). It also already uses Zod and treats parsed save data as `unknown` in [`schemas.ts`](../../src/state/schemas.ts) and [`saveManager.ts`](../../src/state/saveManager.ts), and its engine tests prove deterministic output from a fixed seed.

The remaining gaps are concrete rather than architectural:

- `CharacterSheet` is declared separately from `characterSheetSchema`, followed by casts after validation. Two representations can drift.
- Save decode uses undifferentiated thrown `Error` values; roster parsing silently drops invalid records and storage write failures are not modeled.
- [`prng.ts`](../../src/engine/prng.ts) and `createNewCharacter` accept `any`, while several creation paths mix explicit seeds with `Date.now()`.
- [`tsconfig.app.json`](../../tsconfig.app.json) does not currently enable the full strictness promised by `AGENTS.md`.
- deployment runs unit tests and build, but not lint, E2E, Nexus verification, dependency audit, or an explicit configuration/contract check.

## Adopt now

### 1. Schema-owned external contracts

Nexus composes one `AppConfigSchema`, infers `AppConfig` with `z.infer`, parses YAML as `unknown`, and validates both defaults and loaded files before exposing typed data. Its loader also keeps parse, validation, and path failures distinct. See the official [`schemas.ts`](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/packages/nexus-agents/src/config/schemas.ts) and [`config-loader.ts`](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/packages/nexus-agents/src/config/config-loader.ts), with boundary tests in [`config-loader.test.ts`](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/packages/nexus-agents/src/config/config-loader.test.ts).

Apply the same rule only to ProgQuest's external data:

- define a versioned save envelope when compatibility work begins;
- infer the persisted character type from its Zod schema, or add a compile-time equivalence test while legacy engine naming is retained;
- validate imported text and every local-storage record before state mutation;
- add realistic upper bounds for strings, arrays, quantities, and progress values so syntactically valid hostile saves cannot create unreasonable memory or rendering work;
- fail closed and preserve the current session when validation fails.

Do not add Zod validation between trusted engine functions. That would duplicate TypeScript checks at runtime without protecting a boundary.

### 2. One session-entry contract

Nexus's standards emphasize explicit dependencies and boundary tests, while its consolidation ADR favors one canonical path over parallel implementations. See [`CODING_STANDARDS.md`](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/CODING_STANDARDS.md) and [ADR-0005](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/docs/adr/0005-router-consolidation.md).

For ProgQuest, the discriminated `StartSessionRequest` is the correct UI-to-state contract:

```ts
type StartSessionRequest =
  | { source: 'creation'; name: string; race: string; klass: string; stats?: StatsMap }
  | { source: 'import' | 'roster'; character: CharacterSheet };
```

All three entry paths should use that action, which alone establishes the session invariants: character, RNG, log, and pause state change together. Keep this as a type and a store action; an interface plus factory would add no depth with one implementation.

### 3. Honest outcomes for recoverable boundary failures

Nexus's canonical [`Result<T, E>`](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/packages/nexus-agents/src/core/result.ts) is a small discriminated union. Its standards separately require error responses to reflect actual failure rather than wrapping failure as success.

Use that idea for operations where the UI must branch on expected failure, especially save decode/import and local-storage writes. A small ProgQuest-specific error union such as `malformed_base64 | invalid_json | invalid_schema | storage_unavailable` is enough. Map it to human-readable copy once in the UI. Do not introduce Nexus's global error hierarchy or use `Result` for ordinary pure game calculations.

### 4. Determinism at the narrow entropy seam

Nexus makes time and randomness injectable and verifies seeded providers with same-seed replay tests; see [`random-provider.ts`](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/packages/nexus-agents/src/core/random-provider.ts), its [tests](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/packages/nexus-agents/src/core/random-provider.test.ts), and [ADR-0006](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/docs/adr/0006-determinism-providers.md).

ProgQuest already has the deeper game-specific abstraction: `RandomGenerator`. Keep it. Replace its `any` seed with the actual accepted seed type, pass an RNG or explicit seed through engine creation, and inject a `now: () => number` only into the session-creation seam that currently uses `Date.now()`. Do not add global provider singletons.

Contract tests should prove:

- identical seed plus inputs yields identical character/task sequences;
- restoring PRNG state resumes the same sequence;
- creation/import/roster session entry resets all session invariants;
- malformed external data leaves current state unchanged.

### 5. Executable configuration and quality gates

Nexus validates configuration before runtime and layers lint, type checking, tests, coverage, security checks, and drift checks in its official [CI workflow](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/.github/workflows/ci.yml). Its published package also ships bounded review/security/refactoring workflows; the installed copies are under `node_modules/nexus-agents/src/workflows/templates/`.

For ProgQuest, the proportionate gate is:

```text
npm ci
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run test:e2e
npm audit
npm run agents:verify
git diff --check
```

The original recommendation to run Nexus PR review at handoff is superseded while adapterless runs can emit zero-token heuristic findings. Use independent Codex reviewers and `.agents/skills/code-review` until upstream [#4350](https://github.com/nexus-substrate/nexus-agents/issues/4350) and [#4351](https://github.com/nexus-substrate/nexus-agents/issues/4351) are fixed and verified locally. Keep `.nexus-agents/` and browser/test artifacts ignored. Add a drift script only when a real duplicated registry or generated artifact exists; generic drift infrastructure would be speculative.

### 6. Security and observability proportional to a browser game

Nexus's relevant security lesson is to treat parsed data as `unknown`, validate before use, preserve causes internally, and avoid secrets in logs. Its config loader also guards dangerous prototype keys during deep merge, and its logger recursively redacts credentials. See [`config-loader.ts`](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/packages/nexus-agents/src/config/config-loader.ts), [`logger.ts`](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/packages/nexus-agents/src/core/logger.ts), and [`SECURITY.md`](https://github.com/nexus-substrate/nexus-agents/blob/94090768e54f783667920741103e05542d443644/SECURITY.md).

ProgQuest needs save-size limits, schema validation, no partial state mutation, and truthful user-visible errors. It does not need server path controls, rate limiting, credential telemetry, or a security event pipeline. For observability, keep the existing bounded activity log and add structured save/session diagnostics only if a real debugging or support need appears.

## Defer or reject

| Nexus practice | ProgQuest decision | Upgrade trigger |
| --- | --- | --- |
| Interfaces before every implementation | Reject | Add an interface only when there are multiple implementations or a difficult test seam. |
| `Result` for every fallible function | Reject | Use it only when callers branch on expected recovery. |
| Global error hierarchy and codes | Defer | Multiple domains need shared logging/transport behavior. |
| Global time/random providers | Reject | Existing `RandomGenerator` cannot satisfy a demonstrated replay/test need. |
| Fixed 400-line/50-line/complexity limits | Defer | Measurements show review or defect problems that a lint threshold would catch. |
| Hash-chained audit, event bus, traces, telemetry store | Reject | ProgQuest becomes a multi-user service with compliance or forensic requirements. |
| Agent routing, memory backends, consensus protocols inside application code | Reject | Never part of the game runtime; use Nexus only as development tooling. |
| Sandboxing, path allowlists, command classifiers | Reject for current web app | Server-side file/process execution is introduced. |
| Whole-repo coverage target copied verbatim | Defer | Establish a baseline and choose risk-based targets; validation/error paths should be exhaustive now. |

## Minimal implementation order

1. Finish the single `startSession` seam and its entry-path contract tests.
2. Remove `any` from RNG/seed inputs and make creation reproducible without a global provider.
3. Make the Zod save schema/type relationship canonical and add strict negative boundary tests.
4. Introduce typed save/storage outcomes only where the UI needs recovery choices.
5. Put lint, typecheck, unit, build, E2E, Nexus verification, and audit into CI.

This order deepens existing modules and deletes ambiguity before adding any reusable infrastructure.
