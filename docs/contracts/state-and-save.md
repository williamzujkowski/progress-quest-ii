# ProgQuest boundary contracts

These are the deliberately small, executable contracts at module seams. TypeScript remains the contract inside trusted engine code; Zod is reserved for untrusted browser storage and imported save text.

## Persisted character

Owner: `src/state/schemas.ts`

- The existing JSON character-sheet shape remains unchanged.
- Imported and roster data is parsed as `unknown` and must satisfy `characterSheetSchema` before state mutation.
- Strings, collections, quantities, currency, levels, and progress values have explicit upper bounds.
- A save import larger than 1 MB is rejected before base64 decoding.
- Unknown or invalid roster records are dropped; prototype-like character names remain ordinary own keys.
- A versioned envelope is deferred because introducing one is a compatibility decision requiring unanimous approval.

Verified by: `src/__tests__/state/saveManager.test.ts`.

## Session entry

Owner: `src/state/gameStore.ts`

`StartSessionRequest` is the single UI-to-state command:

- `creation` supplies name, race, class, an explicit deterministic seed, and optionally an accepted stat roll.
- `import` and `roster` supply a schema-validated character sheet.
- The action replaces character, RNG, activity log, and pause state atomically.
- Imported objects are defensively copied.
- Equal creation inputs and seed replay the same character and RNG state.

Verified by: `src/__tests__/state/gameStore.test.ts` and `e2e/app.spec.ts`.

## Save import outcome

Owner: `src/state/saveManager.ts`

`decodePQWSave` returns a discriminated `SaveResult`, with distinct error codes for oversized input, malformed base64, invalid JSON, and invalid schema. Expected user-correctable failures are data, not exceptions. The UI starts a session only from an `ok` result, so a failed import preserves the active session.

## Entropy

Owner: `src/engine/prng.ts`

- `PRNGSeed` is `string | number`; no untyped seed inputs are accepted.
- Existing `RandomGenerator` is the only random abstraction.
- Session creation passes its explicit UI roll seed instead of reading the clock.
- Optional clock defaults remain only for standalone engine helpers whose callers do not request replay.

## Quality gates

CI and deployment gates: dependency install, full Nexus installation verification, lint, typecheck, unit/contract tests, production build, Playwright E2E, and high-severity dependency audit. The Nexus verifier treats missing hosted-runner CLI authentication as a warning while still failing hard installation/configuration errors.

PR handoff gates: `npm run agents:review` and `git diff --check`.
