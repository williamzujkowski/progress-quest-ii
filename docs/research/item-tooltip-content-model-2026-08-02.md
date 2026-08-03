# Meaningful item tooltip content model

## Question

How can every ProgQuest equipment item, inventory item, and spell receive a stable description that feels specific to its identity, stays honest about the simulation, and remains usable in dense desktop and mobile layouts?

## Evidence

- The legacy game already supplies the vocabulary. Spells are an ordered authored list; equipment names combine a base item with numeric and named quality modifiers; special loot combines an attribute, object, and optional “of” concept. These components should drive the writing instead of being reduced to a generic category joke ([legacy data tables](../../pq-web-src/config.js#L337-L590), [legacy generators](../../pq-web-src/main.js#L566-L664)).
- Legacy loot is encumbrance and market value, not a hidden combat system. Gold is the first inventory row and is excluded from the encumbrance sum; ordinary loot sells for quantity × level; an “of” item receives a random value multiplier at sale ([legacy inventory update](../../pq-web-src/main.js#L365-L394), [legacy task and sale loop](../../pq-web-src/main.js#L297-L360)). Equipment quality is generated and spell level helps choose `bestspell` metadata when saving, but the baseline task duration does not expose per-item damage, mitigation, or spell damage ([legacy spell/equipment selection](../../pq-web-src/main.js#L566-L621), [legacy best-spell selection and save](../../pq-web-src/main.js#L1064-L1095)).
- Kingdom of Loathing's official documentation makes item categories and actual effects inspectable: items may be equipment, consumables, ingredients, or intentionally useless, while enchanted equipment can change stats, HP, MP, and other effects. The applicable lesson is **flavor plus an explicit effect**, not imitation of its prose ([official item documentation](https://www.kingdomofloathing.com/doc.php?topic=items), [official enchanted-item documentation](https://www.kingdomofloathing.com/doc.php?topic=enchanted)).
- Universal Paperclips gets tonal mileage from terse operational labels beside exact state: “Lost to value drift,” “Hazard Remediation,” and a direct explanation of what Combat changes. The applicable lesson is restrained institutional language around absurd facts, with the actual number or rule kept legible ([official web game](https://www.decisionproblem.com/paperclips/index2.html)).
- The current Zombo.com says it is under new management and that its content is new while the operator seeks rights to the former site. Treat “total commitment to an impossible promise” as a high-level tonal reference only; do not copy its wording or imply access to the original material ([current first-party site](https://www.zombo.com/)).
- The existing generator has only six spell-specific openings, three openings per inventory category, and shared closers. It keys inventory lore by quantity, so acquiring another copy rewrites the item's history, and claims spell level improves combat priority even though no modern engine/state caller uses spell level for combat ([current generator](../../src/data/itemDetails.ts#L60-L110), [current spell state update](../../src/state/gameStore.ts#L40-L46)). The component already renders a body portal with `role="tooltip"` and `aria-describedby`, but it closes as soon as the pointer leaves the trigger, has no Escape handler, and has `pointer-events: none` ([tooltip component](../../src/components/ItemTooltip.tsx#L12-L80), [tooltip styles](../../src/App.css#L244-L277)). Current tests encode quantity-dependent flavor and cover focus/viewport placement, but not Escape, hover persistence, or touch activation ([unit tests](../../src/__tests__/itemDetails.test.ts#L4-L35), [browser tests](../../e2e/app.spec.ts#L175-L204)).
- W3C's tooltip pattern calls for focus/hover activation, `role="tooltip"`, `aria-describedby`, focus remaining on the trigger, and Escape dismissal. WCAG 2.1 SC 1.4.13 additionally requires hover/focus content to be dismissible, hoverable, and persistent ([W3C tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/), [W3C SC 1.4.13 guidance](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html)).

## Recommended content contract

Each tooltip has three layers:

1. **Identity:** the visible canonical name; never hide it in prose.
2. **Micro-story:** one or two short sentences whose vocabulary is derived from the item's actual name components.
3. **Effect:** a visually separate, literal statement derived from engine/data facts. Flavor may allege tax fraud; effects may not invent rarity, damage, status effects, or sale prices that are not currently knowable.

Use an immutable identity key for flavor:

```text
equipment:<slot>:<canonical name>
spell:<canonical name>
inventory:<canonical name>
```

Quantity, spell level, render order, character, and save time are mutable context. They belong in the effect line and must not change the micro-story. Use the full key with independent salts for each clause (`origin:`, `incident:`, `warning:`) so clauses vary independently without runtime randomness or persisted generated prose.

### Meaningful grammars

| Kind | Identity-derived material | Suggested micro-story shape | Truthful effect |
| --- | --- | --- | --- |
| Weapon | explicit bonus, offense modifier, base weapon | dubious provenance + workplace incident | computed equipment quality; explicitly not exact damage |
| Shield/armor | slot, defense modifier, base material/item | procurement claim + warranty exclusion | computed equipment quality; explicitly not exact mitigation |
| Special loot | item attribute + object + optional “of” concept | condition/origin + consequence of the named concept | quantity, encumbrance, and only sale behavior the engine can guarantee |
| Monster loot | monster/item tokens when present in canonical data | incident report + biological/legal warning | quantity and encumbrance; no direct combat effect |
| Mundane loot | known boring-item token | former household purpose + bureaucratic demotion | quantity and encumbrance |
| Spell | canonical spell name | one authored premise + deterministic warning | current level; no spell-specific combat effect unless one is implemented later |
| Gold/empty slot | explicit special case | one concise fixed line | weightless currency / no effect |

“Meaningful” means that changing an identity component changes a corresponding idea in the prose. For generated special loot, the attribute should influence condition, the object should influence provenance or misuse, and the “of” concept should influence the consequence. Do not merely select two unrelated jokes from a large global pool.

## Minimum implementation slices

1. **Identity stability:** remove quantity and spell level from flavor selection; retain them only in effect text. Add independent salted clause selection to the existing pure generator—no dependency, network call, runtime AI, or save migration.
2. **Coverage:** author a premise for every finite spell name. Add component-aware grammar for equipment and loot, reusing the canonical tables rather than duplicating item catalogs.
3. **Truthfulness:** centralize each effect statement on existing calculations. Keep unknown mechanics explicitly abstract; coordinate richer combat numbers with the separate combat-breakdown work rather than guessing.
4. **Interaction:** keep the body portal and viewport clamp, then add Escape dismissal, hover persistence over the popup, and tap/click toggle with outside dismissal. The popup stays non-interactive; if future tooltip content gains controls, promote it to a non-modal dialog instead of stretching the tooltip pattern.

## Testable acceptance criteria

- Repeating a description for the same identity returns byte-identical flavor.
- Changing only inventory quantity or spell level does not change flavor; the effect line updates.
- Every canonical spell has an authored premise; unknown imported names receive a safe deterministic fallback.
- Equipment effects match the canonical base/modifier tables, including explicit positive and negative residuals and empty slots.
- Gold is not described as encumbrance. Other inventory effects agree with `calculateEncumbrance`; “of” loot does not claim a stable sale price because the legacy multiplier is random at sale.
- Spell effects report level without claiming combat priority or damage. If `bestspell` is explained, describe it narrowly as save/roster metadata and test the exact legacy formula.
- A catalog test enumerates canonical spells, equipment bases/modifiers, boring items, monster drops, and a representative cross-product of special loot. It asserts non-empty bounded text, no `undefined`/`NaN`, identity-component reflection, and reports exact-description collisions. Finite authored spell premises should have zero collisions; procedural categories should meet an agreed collision ceiling rather than require an enormous prose table.
- Property tests cover determinism, quantity/level independence, unknown names, Unicode, empty strings, and very long imported names.
- Playwright covers mouse hover, keyboard focus, Escape, pointer travel from trigger to popup, click/tap toggle, outside dismissal, and viewport containment at desktop and narrow mobile sizes.
- The trigger remains keyboard reachable with a visible focus indicator; `aria-describedby` points to the open `role="tooltip"`; the tooltip does not receive focus; flavor and effects retain WCAG AA contrast in every supported theme.
- All new prose is original. External games inform structure and restraint, not copied lines, names, or jokes.

## Decision

Prefer deterministic, component-aware micro-stories over a larger bag of generic punchlines. The name is already procedural; the tooltip should explain why this particular combination is regrettable, while the effect line remains boringly true.
