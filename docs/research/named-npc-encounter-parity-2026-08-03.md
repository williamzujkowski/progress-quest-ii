# Named NPC encounter parity — 2026-08-03

## Recommendation

Restore the NPC branch inside the existing pure task generator, using the already-canonical `RACES`, `KLASSES`, `TITLES`, and `generateName` sources. Test both NPC forms through public `generateTaskDescription`; add one titled or passing fixture to the existing full-transition parity matrix. Do not export the private monster helper or introduce another encounter model.

## Authoritative behavior

`MonsterTask(requestedLevel)` first runs exactly `requestedLevel` perturbation iterations for a positive integer character level. Every iteration consumes `Random(5)`; only results 0 or 1 consume `Random(2)`, producing -1 or +1 respectively. It then clamps the accumulated target level to at least 1. The next `Random(25)` enters the NPC branch only on 0, before any quest-monster or ordinary-monster selection. ([legacy task generator](../../pq-web-src/main.js#L205-L231), [Odds and RandSign](../../pq-web-src/main.js#L41-L50))

After the successful gate, both forms consume `Random(21)` to select the race name and then `Random(2)` to select the form:

- **Passing, branch result 0:** consume `Random(18)` for the class. The raw monster is `passing <Race> <Class>|<level>|*`; the returned description is `a passing <Race> <Class>`.
- **Titled, branch result 1:** `PickLow(K.Titles)` consumes two `Random(9)` calls and takes their smaller index. `GenerateName()` then consumes `Random(22), Random(14), Random(12)` twice. The raw monster is `<Title> <Name> the <Race>|<level>|*`; the returned description omits any article because `definite` is true.

These table sizes and their ordering are defined by the legacy race, class, and title arrays; the six name picks cycle through the three legacy syllable arrays. ([NPC construction](../../pq-web-src/main.js#L214-L225), [PickLow](../../pq-web-src/main.js#L49-L55), [legacy name generator](../../pq-web-src/config.js#L143-L157), [legacy NPC tables](../../pq-web-src/config.js#L942-L994))

For an NPC, `lev` is assigned the perturbed target level. Consequently the difference is zero: quantity stays 1, no age/size/special caption branch consumes RNG, and the returned effective opponent level is exactly the perturbed/clamped target. The final call counts are therefore `requestedLevel + successfulPerturbations + 4` for passing NPCs and `requestedLevel + successfulPerturbations + 11` for titled NPCs. ([level, grammar, and return](../../pq-web-src/main.js#L224-L280))

`Dequeue` turns the returned description into `Executing <description>`, and `Task` appends `...`. The `*` in kill-tag field 3 means that completing this newly generated encounter later calls `WinItem`; it does not consume that loot RNG while the NPC task is created. ([task wiring](../../pq-web-src/main.js#L297-L305), [caption and duration](../../pq-web-src/main.js#L355-L360), [ellipsis](../../pq-web-src/main.js#L816-L821))

## Reproducible level-one vectors

Running the authoritative code from a state immediately before `MonsterTask(1)` gives:

| Form | Starting Alea state | Random `(limit → result)` trace | Raw kill tag | Display caption | Final Alea state |
| --- | --- | --- | --- | --- | --- |
| Passing | `[0.8579177698120475, 0.8263699773233384, 0.24956287536770105, 1]` | `5→3, 25→0, 21→7, 2→0, 18→2` | `kill\|passing Talking Pony Robot Monk\|1\|*` | `Executing a passing Talking Pony Robot Monk...` | `[0.44347366294823587, 0.86426544142887, 0.03502870723605156, 1408544]` |
| Titled | `[0.1729756232816726, 0.18765057669952512, 0.41180504229851067, 1]` | `5→4, 25→0, 21→2, 2→1, 9→7, 9→0, 22→8, 14→4, 12→2, 22→13, 14→1, 12→6` | `kill\|Mr. Midan the Half Halfling\|1\|*` | `Executing Mr. Midan the Half Halfling...` | `[0.21785219269804657, 0.8072053005453199, 0.47258021542802453, 308334]` |

The existing `one-kill.json` transition shape can use either starting state unchanged elsewhere: its completed Rat has fixed loot, and its XP, quest, and plot bars do not cross a boundary before the next task is generated. The oracle loads the supplied Alea tuple, executes exactly one `Timer1Timer` transition, and records the resulting task tag, caption, duration, and final RNG; its test runner automatically executes every JSON fixture twice and requires deterministic equality. ([oracle entrypoint](../../scripts/legacy-oracle.mjs#L52-L66), [recorded transition](../../scripts/legacy-oracle.mjs#L85-L99), [fixture runner](../../scripts/test-legacy-oracle.mjs#L6-L20))

## Minimal modern seams

- `generateTaskDescription(rng, character)` is already the public pure task-generation seam; `generateMonsterTask` should remain private. ([modern task generator](../../src/engine/sim.ts#L293-L354), [public task seam](../../src/engine/sim.ts#L354-L381))
- The canonical modern data already exists as `RACES`, `KLASSES`, and `TITLES`, while the legacy-compatible six-pick algorithm already exists as `generateName`. Reuse them rather than adding NPC-only copies. ([modern NPC tables](../../src/data/traits.ts#L509-L570), [modern name generator](../../src/engine/math.ts#L51-L62))
- `ProgressTask.loot` already represents `{ type: 'random' }`; no type or serialization change is needed. ([task contract](../../src/engine/types.ts#L39-L45))
- `advanceGame` already calls `generateTaskDescription` after applying the completed task, so one oracle fixture can exercise the real transition without UI dependencies. ([live transition seam](../../src/engine/transition.ts#L182-L188))
- The transition parity observation currently compares the next caption and duration but drops the legacy task tag and modern loot. Extend that existing observation just enough to compare random loot; do not create a second parity harness. ([current observation contract](../../src/__tests__/fidelity/transitionParity.ts#L34-L69), [legacy/modern projection](../../src/__tests__/fidelity/transitionParity.ts#L89-L100), [modern projection](../../src/__tests__/fidelity/transitionParity.ts#L164-L172))

## Test sequence

1. Add two oracle fixtures from the vectors above; the existing Node runner proves legacy caption, tag, duration, and final Alea state.
2. Add focused tests through `generateTaskDescription` for passing and titled output, `{ type: 'random' }`, duration/effective level, and exact final RNG.
3. Add one of the fixtures to `transitionParity.test.ts` and include next-task loot in the shared observation.
4. Keep the ordinary and quest-monster parity vectors unchanged; they prove that replacing the currently discarded `Random(25)` result does not alter those paths.
