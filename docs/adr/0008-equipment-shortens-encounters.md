# Equipment shortens encounters

Status: accepted
Decision date: 2026-08-08

## Context

Canonical Progress Quest gives equipment no mechanical effect. A kill's duration is
`2 * 3 * opponentLevel * 1000 / characterLevel` — opponent puissance over character level, and
nothing else. Equipment ratings describe the prestige of what was generated, not power.

Two documents state this outright. `CONTEXT.md` records that generation quality "contributes no
attack or mitigation because classic combat has neither calculation", and that equipment, spells,
loot and gold have no effect on encounter time. `src/state/commendations.ts` restates it: equipment
is "prestige, not power".

The owner has decided that equipment should mean something.

## Decision

Equipment shortens encounters, through one multiplier applied after the canonical duration:

```
durationMs = floor(canonicalDuration * 1000 / (1000 + loadoutQuality))
```

`loadoutQuality` sums the eleven equipped slots using the same per-item rating the tooltips already
derive, so the two can never disagree about what an item is worth.

**Quality floors at zero.** A negative loadout is reachable and ordinary — `-3 Burlap` is the
starting hauberk — and letting it lengthen encounters would mean a threadbare hauberk punishing the
player for wearing it. That reads as a defect rather than a mechanic. Negative effects belong to
adversaries, as something done to the hero rather than a property of their own gear, and are not
part of this decision.

The curve is asymptotic rather than linear. `1000 / (1000 + quality)` approaches zero without
reaching it, so an encounter can become very fast and never becomes instant or negative. A linear
reduction would need a clamp, and a clamp is a second rule that has to be kept true.

## Consequences

**Every recorded golden is arithmetically unchanged.** This is a property of the floor rather than
a coincidence: the captured sessions carry zero or negative loadouts, which floor to zero, which
makes the multiplier exactly one. Not approximately one — exactly. Had the floor been rejected, at
least one golden would have moved and each would have needed a deliberate edit.

**`CONTEXT.md` is now wrong in two places** and is superseded here rather than silently left. The
statements were true of the original and are no longer true of this build, which is what ADR 0003
anticipated when it recorded that this is a spiritual successor free to diverge deliberately.

**The effect arrives late.** A scale of 1000 is far above what a mid-game loadout reaches, so early
play is untouched and the mechanic becomes noticeable as the numbers grow — the same shape the rest
of this game's escalation already has.

**Nothing else in the simulation reads equipment.** This is the only coupling introduced, and it is
one multiplication at one site.

## Not included

The threshold-and-zeros display mechanic the owner described — carrying a mantissa and a decade
count so displayed numbers grow without the engine doing arithmetic on large ones — is independently
useful and independently testable, and lands separately.
