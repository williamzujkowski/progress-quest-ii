# ProgQuest boundary contracts

These are the deliberately small, executable contracts at module seams. TypeScript remains the contract inside trusted engine code; Zod is reserved for untrusted browser storage and imported save text.

## Persisted character

Owner: `src/state/schemas.ts`

- The existing JSON character-sheet shape remains unchanged.
- That exact unversioned modern shape is the frozen **PQW v0** compatibility profile. Every object boundary is strict, so unknown fields and unrecognized version markers fail closed instead of being silently discarded.
- Imported and roster data is parsed as `unknown` and must satisfy `characterSheetSchema` before state mutation.
- Strings, collections, quantities, currency, levels, and progress values have explicit upper bounds.
- Prime stats are positive integers; HP/MP maxima are positive numbers. Quest/plot progress may equal but never exceed its positive maximum, and task elapsed time may equal but never exceed its duration.
- Inventory identities are exact and case-sensitive. One empty identity remains valid for established reward parity, but duplicate identities are rejected without normalization.
- A save import larger than 1 MB is rejected before base64 decoding.
- A roster is rejected and preserved in full if any record is invalid; partial recovery must never make the next write destructive.
- Character names contain 1–120 UTF-16 code units. Exact names are case-sensitive roster identities, and a later explicit save replaces the prior entry with that identity.
- Prototype-like character names remain ordinary own keys. Existing object-shaped roster JSON is rehydrated into a null-prototype record without changing the persisted shape.
- A future format must use a versioned envelope and retain a PQW v0 reader. Classic tuple-shaped PQW migration remains tracked by #2; it must not be parsed as modern v0.

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

Run the deterministic legacy data and isolated transition-oracle contracts separately with `npm run test:fidelity`.

PR handoff gates: `npm run agents:review` and `git diff --check`.
