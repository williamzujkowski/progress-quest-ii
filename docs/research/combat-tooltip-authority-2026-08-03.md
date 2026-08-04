# Combat tooltip authority — 2026-08-03

## Recommendation

Reframe issue #58 around **truthful progression facts**, not an invented combat model. Canonical Progress Quest has no attack rolls, damage, armor mitigation, current HP/MP, spell casting, mana spending, or fail state. A kill is a timed task whose duration depends only on character level and opponent puissance. Equipment ratings describe generated equipment quality; spell levels describe repeated learning; loot occupies capacity and becomes gold at market. ([legacy encounter generation](../../pq-web-src/main.js#L205-L280), [legacy duration wiring](../../pq-web-src/main.js#L355-L359), [legacy completion/progression](../../pq-web-src/main.js#L906-L942))

The smallest honest implementation is therefore:

1. Rename equipment tooltip “attack/defense rating” to **quality rating**, show its base/modifier/residual arithmetic, and explicitly say it does not alter encounter duration.
2. Keep **spell mastery level** and, if useful, identify the spell’s learned-list prestige score as roster/brag metadata—not damage.
3. Show inventory **stack load**, **load per unit**, and level-dependent prospective market value. Gold has zero load.
4. Do not add attack, mitigation, DPS, spell damage, cooldown, elemental, or proc fields. They would be Progress Quest II inventions and require a separately approved game-design issue rather than a “fidelity” implementation.

## What combat actually computes

`MonsterTask` perturbs the requested character level, selects an NPC, quest monster, or nearby ordinary monster, adjusts the caption and quantity for the level difference, and returns an aggregate opponent level. None of the character’s equipment, spells, prime stats, HP Max, or MP Max is read by this algorithm. ([legacy opponent algorithm](../../pq-web-src/main.js#L205-L280))

The task duration is:

```text
floor(2 * 3 * aggregateOpponentLevel * 1000 / characterLevel)
= floor(6000 * aggregateOpponentLevel / characterLevel) milliseconds
```

The modern engine preserves that formula as `Math.floor((2 * 3 * opponentLevel * 1000) / characterLevel)`. Its generated task contract contains description, duration, type, and optional loot—not attacks, damage, defenses, HP changes, or spell casts. ([legacy duration](../../pq-web-src/main.js#L355-L359), [modern duration](../../src/engine/sim.ts#L355-L362), [modern task contract](../../src/engine/types.ts#L39-L45))

Completing a kill advances experience, quest, and plot by the task’s duration in seconds. Level-up rewards may raise stats and teach a spell, but no combat result is resolved. The modern transition likewise advances progression by `task.durationMs / 1000`, then awards loot and starts another task. ([legacy progression](../../pq-web-src/main.js#L906-L942), [modern progression](../../src/engine/transition.ts#L39-L90), [modern kill reward](../../src/engine/transition.ts#L97-L159))

### Worked encounter

A level-5 character facing aggregate opponent puissance 7 receives:

```text
floor(6000 * 7 / 5) = 8,400 ms
```

Changing a Stick to a Vorpal Bandyclef, learning Infinite Confusion XX, or raising HP Max leaves those 8,400 ms unchanged. Those values do not occur in either duration expression.

## Equipment numbers: quality, not damage or armor

The weapon, shield, and armor tables assign numeric **base qualities**. Positive and negative adjective tables assign additional values. The legacy upgrade generator chooses a random slot, samples six bases while retaining the one closest to character level, then spends the difference with at most two adjective values and a residual signed integer prefix. ([legacy quality tables](../../pq-web-src/config.js#L386-L489), [legacy negative modifiers](../../pq-web-src/config.js#L915-L940), [legacy upgrade generator](../../pq-web-src/main.js#L571-L621))

The construction preserves this invariant for generated equipment:

```text
base quality + adjective values + residual numeric prefix = character level
```

The modern generator ports the same selection and balancing arithmetic. It stores only the resulting name in the equipment slot; no rating is stored or consumed by task generation. ([modern equipment tables](../../src/data/traits.ts#L71-L179), [modern negative modifiers](../../src/data/traits.ts#L461-L488), [modern upgrade generator](../../src/engine/sim.ts#L202-L240), [character equipment contract](../../src/engine/types.ts#L14-L27))

Current tooltip code reconstructs `base + modifiers + explicit prefix` from the name, labels the result “Attack rating” for weapons or “Defense rating” elsewhere, and says the simulation applies it as equipment quality. The arithmetic is useful, but “attack/defense” implies mechanics that do not exist. This parser is currently UI data logic rather than an engine authority. ([current parser](../../src/data/itemDetails.ts#L40-L55), [current equipment effect copy](../../src/data/itemDetails.ts#L186-L217), [tooltip dispatch](../../src/components/ItemTooltip.tsx#L21-L25))

### Worked equipment

- Initial `-3 Burlap` has base Burlap quality 3 plus residual -3, so its quality is 0. ([Burlap table value](../../src/data/traits.ts#L116-L121), [initial equipment](../../src/engine/sim.ts#L24-L36))
- A possible level-10 upgrade named `+1 Vicious Longsword` has Longsword 6 + Vicious 3 + residual 1 = quality 10. ([Vicious value](../../src/data/traits.ts#L71-L83), [Longsword value](../../src/data/traits.ts#L139-L178))
- A Vorpal Bandyclef has 7 + 15 = quality 22, but that 22 is still not added to a damage roll or used to shorten a task.

Equipment is acquired as a quest reward, an act reward, or a market purchase. The purchase price is `5L² + 10L + 20`; legacy code starts buying only when gold is **strictly greater** than that price, then spends exactly the price. The modern formula is identical, although its gate currently uses `>=`. ([legacy price and purchase](../../pq-web-src/main.js#L291-L309), [legacy strict gate](../../pq-web-src/main.js#L343-L352), [modern price](../../src/engine/sim.ts#L16-L18), [modern gate and purchase](../../src/engine/sim.ts#L365-L383), [modern purchase completion](../../src/engine/transition.ts#L172-L179))

At level 5, an upgrade costs `5×25 + 10×5 + 20 = 195` gold. Canonically 195 gold is not enough to initiate the purchase; 196 is, leaving 1 gold after the 195-gold transaction.

## Spell numbers: mastery and roster prestige only

There are 48 canonical spell names and no spell-specific numeric data. `WinSpell` limits selection to the first `min(WIS + Level, 48)` names and selects the lower of two uniform indices, biasing learning toward earlier eligible names. Learning an existing name increments its Roman-numeral level; learning a new name creates level I. ([spell catalog](../../pq-web-src/config.js#L337-L384), [two-roll low selector](../../pq-web-src/main.js#L49-L55), [spell reward](../../pq-web-src/main.js#L566-L569), [Roman-level increment](../../pq-web-src/main.js#L840-L842))

Level-up always teaches one spell; quest completion has a one-in-four reward branch that may teach one. The modern engine represents spells as `{name, level}`, uses the same `min(WIS + Level, catalog length)` two-roll selection, and increments mastery by one. ([legacy level reward](../../pq-web-src/main.js#L875-L883), [legacy quest reward](../../pq-web-src/main.js#L666-L672), [modern spell contract](../../src/engine/types.ts#L34-L37), [modern spell reward](../../src/engine/sim.ts#L158-L171))

The only downstream legacy calculation involving a spell level chooses a `bestspell` for save/roster/brag display. It scores each learned-list row as `(zero-based learned-list position + 1) × mastery level`; it does not use canonical catalog position and does not affect gameplay. ([best-spell selector](../../pq-web-src/main.js#L1064-L1077), [roster display](../../pq-web-src/roster.html#L177), [brag payload](../../pq-web-src/main.js#L1307-L1308))

### Worked spell

If `Cone of Annoyance III` is the ninth row in the character’s learned spell list, its roster prestige score is `(8 + 1) × 3 = 27`. The number is only useful when comparing which learned spell gets advertised as `bestspell`; it is not damage, mana cost, duration, or cast chance.

The current tooltip is therefore directionally correct: it reports spell level and says there is no exposed spell-specific combat effect. “Mastery level” is a clearer label than an unexplained generic level. ([current spell tooltip facts](../../src/data/itemDetails.ts#L277-L283))

## Loot numbers: quantity, load, drop generation, and sale value

### Fixed and random drops

Every completed kill with a fixed monster drop adds one unit of `<monster> <drop>` to the matching inventory row. A `*` drop invokes `WinItem`: it either duplicates a randomly selected existing inventory row when `max(250, Random(999)) < Inventory.length()`, or generates exactly `<ItemAttrib> <Special> of <ItemOf>`. The inventory length includes the Gold row, so duplication is impossible through 250 rows; at 251 rows it occurs for 251 of 999 random results before the independent row pick. ([legacy kill award](../../pq-web-src/main.js#L297-L305), [legacy special-item grammar](../../pq-web-src/main.js#L646-L663), [special-item tables](../../pq-web-src/config.js#L491-L617))

The modern fixed-drop representation is truthful, but its random `*` completion path currently uses a different 50/50 two-part-or-three-part generator and never applies the legacy duplicate threshold. This parity defect is tracked in [#138](https://github.com/williamzujkowski/progress-quest-ii/issues/138). ([modern random-loot helper](../../src/engine/sim.ts#L192-L200), [modern completion call](../../src/engine/transition.ts#L148-L159))

### Encumbrance

Every non-Gold inventory unit weighs exactly one cubit, regardless of name or rarity. Gold weighs zero. Capacity is `STR + 10`; reaching capacity sends the character to market. ([legacy inventory recount](../../pq-web-src/main.js#L365-L394), [legacy initial capacity](../../pq-web-src/newguy.js#L133-L137), [legacy market trigger](../../pq-web-src/main.js#L343-L345), [modern load and capacity](../../src/engine/sim.ts#L71-L79), [modern capacity formula](../../src/engine/math.ts#L18-L20))

With STR 12, capacity is 22 cubits. Four rat tails and two Arcane Orbs consume `4 + 2 = 6` cubits; 500 gold consumes zero. Truthful per-item tooltip facts are therefore “1 cubit each” and “stack load: quantity cubits.” Total load/capacity requires character context, which the current inventory tooltip does not receive. ([current inventory props](../../src/components/InventoryView.tsx#L20-L33), [current generic load copy](../../src/data/itemDetails.ts#L392-L422))

### Canonical market value

Legacy market processing sells one non-Gold stack per one-second task. An ordinary stack pays:

```text
quantity × characterLevel
```

If its label contains ` of `, that base is multiplied by:

```text
(1 + RandomLow(10)) × (1 + RandomLow(characterLevel))
```

Each `RandomLow(n)` is the minimum of two `Random(n)` rolls, so the multipliers are biased low rather than uniform. ([legacy market loop and valuation](../../pq-web-src/main.js#L310-L325), [RandomLow](../../pq-web-src/main.js#L49-L55), [` of ` detection](../../pq-web-src/main.js#L900-L902))

At level 5, three ordinary rat tails sell for exactly `3×5 = 15` gold. Three `Arcane Orbs of Danger` have the same 15-gold base and a possible range of `15×1×1 = 15` through `15×10×5 = 750` gold, with low values more likely.

The modern transition currently removes every non-Gold stack at once and pays `quantity × (10 + Random(20))`, or 10–29 gold per unit independent of level and ` of ` grammar. This is not a truthful basis for a legacy-facing tooltip; restoration is tracked in [#139](https://github.com/williamzujkowski/progress-quest-ii/issues/139). ([modern sale](../../src/engine/transition.ts#L160-L171))

## Authoritative tooltip fact matrix

| Surface | Truthful numeric facts | Explicit non-effects |
| --- | --- | --- |
| Weapon | Base quality, named modifier values, residual mark, total quality | Does not change task duration; no attack/damage roll |
| Shield/armor | Base quality, named modifier values, residual mark, total quality | Does not mitigate damage; no armor class or block roll |
| Spell | Mastery level; optionally learned-list prestige score with context | No damage, MP cost, cooldown, duration, or cast chance |
| Fixed monster loot | Quantity, 1 cubit/unit, stack cubits, canonical prospective sale value | No direct combat effect |
| Special ` of ` loot | Quantity, 1 cubit/unit, stack cubits, sale base and biased random range | No direct combat effect despite magical wording |
| Gold | Quantity and purchasing power | Zero cubits; no direct combat effect |
| Encounter (not an item tooltip) | Character level, aggregate opponent puissance, `floor(6000P/L)` duration | Equipment/spells/stats do not modify resolution |

## Minimal implementation boundary for #58

- Put equipment-quality parsing in one pure engine/data authority and reuse it from tooltips and tests; do not leave the only interpretation embedded in prose generation.
- Pass only the context actually needed by inventory facts—character level for prospective sale value, and optionally total load/capacity for “after this stack” context. Quantity alone already proves stack cubits.
- Preserve spell mastery as the only default number. Learned-list prestige is optional UI trivia and requires the row position; catalog position would be incorrect.
- First resolve #138 and #139, or phrase sale/random-loot facts explicitly as current-modern behavior. Mixing canonical copy with divergent implementation would be less truthful than the current abstraction warning.
- Close or rewrite #58’s request for “attack, mitigation, spell damage” because no primary source can supply those values. If Progress Quest II deliberately adds active combat later, require a separate voted design contract and save-compatibility decision.
