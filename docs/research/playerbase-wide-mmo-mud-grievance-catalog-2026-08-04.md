# Playerbase-wide MMO/MUD grievance catalog

**Date:** 2026-08-04  
**Issue:** [#148](https://github.com/williamzujkowski/progress-quest-ii/issues/148)  
**Scope:** finite historical-source catalog for later mechanics-neutral simulation

## Decision

Adopt seven broad historical MMO/MUD conventions as reviewed source patterns:

1. travel-window administration;
2. recovery bureaucracy;
3. camp and reset queues;
4. the advancement treadmill;
5. group and loot governance;
6. vendor and storage friction; and
7. encounter spillover.

These are **historical MMO/MUD conventions**, not complaints received by
Progress Quest. Official manuals and system documentation prove that the systems
were widespread; they do not prove that every player disliked them. This note
uses stronger burden/grievance language only where a first-party designer or
redesign note identifies the friction directly.

No player quote, username, forum anecdote, guild rule, famous incident, named
camp, community catchphrase, or donor text belongs in the catalog. The later
simulation may use only the abstract pattern and new project-owned expression.

## Method

A theme was accepted only when all of the following held:

- at least two independent, attributable sources establish the recurring system
  or its recognized friction;
- at least one source is a first-party manual, official system document, official
  redesign note, original administrator/developer document, or designer
  retrospective;
- the pattern can be stated without a source game's names, setting, formulas,
  commands, or distinctive wording;
- its truth boundary can be checked against typed Progress Quest state; and
- it has exactly one disposition: canonical-event classification,
  mechanics-neutral incident for #154, or deferred ruleset proposal for #155.

This is qualitative historical research, not a survey. Duplicate reports,
reaction counts, and a vivid individual complaint are deliberately excluded.

## Catalog record contract

Each retained record has this conceptual shape; #148 ships research data, not a
runtime TypeScript catalog:

```ts
type HistoricalThemeRecord = {
  id: string;
  pattern: string;
  origin: 'historical_mmo_mud';
  evidence: readonly [Citation, Citation, ...Citation[]];
  evidenceClaim: string;
  provenanceNote: string;
  truthBoundary: string;
  disposition:
    | { kind: 'canonical_event_classification'; trigger: string }
    | { kind: 'mechanics_neutral_incident'; trigger: string; prerequisite?: string }
    | { kind: 'deferred_ruleset'; missingMechanic: string; issue: 155 };
};
```

`Citation` records title, publisher/author, URL, publication date when known, and
one original sentence describing the evidence it supplies. There is no candidate
joke or copied source phrase field; authored game copy belongs to #154 and must
pass the #146 editorial contract.

## 1. Travel-window administration

**Pattern.** Reaching the adventure is a route-planning, fare-paying,
timetable-observing phase. Safe departure can require another trip or service.

**Evidence.** Blizzard's *World of Warcraft* game manual documents paid,
discovery-gated flight paths and journeys that take far longer on foot. Ultima
Online's official travel guide distinguishes walking, mounts, fixed public gates,
and resource-backed player travel. Raph Koster's first-party design retrospective
classifies banks and other obligatory stops as barriers around the intended
activity while distinguishing useful staging and recovery downtime.

- [*World of Warcraft* game manual](https://bnetcmsus-a.akamaihd.net/cms/template_resource/263A8NGR8HLZ1556919642368.pdf), Blizzard Entertainment, 2004–2005 second-edition file, physical PDF p. 99.
- [Movement and Travel](https://uo.com/wiki/ultima-online-wiki/beginning-the-adventure/movement-and-travel/), *Ultima Online* official guide.
- [On Socialization and Convenience](https://www.raphkoster.com/games/snippets/on-socialization-and-convenience/), Raph Koster, first-party designer retrospective.

**Provenance.** General travel friction is safe inspiration; protected place,
spell, vehicle, NPC, route, and command names are not.

**Truth boundary.** Commentary may describe only an existing transition. It may
not add travel time, fares, route unlocks, unavailable services, or real players.

**Disposition:** `canonical_event_classification`, triggered by
`event.type === 'task_started'` with `event.task.type === 'heading'` or
`event.task.type === 'heading_to_market'`, and existing market transitions.

## 2. Recovery bureaucracy

**Pattern.** Defeat starts a second job: locate the body, arrange resurrection,
recover possessions, and absorb time or advancement loss.

**Evidence.** Blizzard's game manual defines ghost travel, corpse retrieval,
an alternate resurrection penalty, and repeated-death waiting. Ultima Online's
official guide likewise directs a dead character to resurrection and then back to
the marked corpse. Richard Bartle's first-party virtual-world design text treats
death penalties as combinations of time, character, and property loss rather
than a single combat moment.

- [*World of Warcraft* game manual](https://bnetcmsus-a.akamaihd.net/cms/template_resource/263A8NGR8HLZ1556919642368.pdf), Blizzard Entertainment, 2004–2005 second-edition file, physical PDF pp. 32–33.
- [Death and Resurrection in the Enhanced Client](https://uo.com/wiki/ultima-online-wiki/combat/death-and-resurrection-in-the-enhanced-client/), *Ultima Online* official guide.
- [*Designing Virtual Worlds*](https://mud.co.uk/richard/DesigningVirtualWorlds.pdf), Richard A. Bartle, 2003 edition republished by the author under CC BY-NC-ND 4.0.

**Provenance.** Do not reproduce exact penalties, recovery commands, service
names, locations, or author prose. Retain only the recovery-project abstraction.

**Truth boundary.** Progress Quest currently has no authoritative death,
resurrection, corpse, XP-loss, or item-loss state. A transcript must not claim
that any occurred.

**Disposition:** `deferred_ruleset` to #155. No recovery incident belongs in
#154 unless a later reviewed catalog record gives it a separate, mechanics-neutral
truth contract.

## 3. Camp and reset queues

**Pattern.** Scarce targets plus reset clocks produce waiting, ownership claims,
and disputes over access or engagement.

**Evidence.** CircleMUD's original builder documentation defines timed zone
resets, maximum-existing limits, and a reset mode that can be postponed
indefinitely while a busy zone remains occupied. EverQuest's official Oakwynd
rules explain an encounter-lock system intended to mitigate kill-stealing and
training. Koster's retrospective identifies EverQuest spawn-point waits as a
widely disliked barrier even when they also created social contact.

- [CircleMUD Builder's Manual: Zone Files](https://www.circlemud.org/cdp/building/building-6.html), CircleMUD project documentation.
- [Oakwynd Now Live: Encounter Lock System](https://www.everquest.com/news/eq-oakwynd-now-live), EverQuest/Daybreak, 2023-05-24.
- [On Socialization and Convenience](https://www.raphkoster.com/games/snippets/on-socialization-and-convenience/), Raph Koster.

**Provenance.** “Camp” is generic genre vocabulary, but named camps, server
policies, famous warnings, queue formulations, and Circle/Diku world data are
excluded.

**Truth boundary.** Progress Quest retains typed identity only for the current
quest; prior quests survive only as rendered history strings. It cannot currently
prove an exact repeated typed quest assignment without parsing text, nor can it
claim actual contention, a spawn timer, ownership, kill stealing, or another
connected party.

**Disposition:** `mechanics_neutral_incident` for #154 **after** bounded prior
quest identity or equivalent event-local typed metadata exists, triggered only
by an exact repeated typed quest target/identity. No description-string parsing.

## 4. The advancement treadmill

**Pattern.** Progress means repeating bounded actions while the next threshold
grows; maintenance and bulk turn-ins periodically interrupt the repetition.

**Evidence.** Blizzard's game manual defines “grinding” as fighting the same
monster types in one area for a long time. EverQuest's official progression
server correction says the reward structure encouraged characters to collect
and turn in hundreds of low-level items instead of fighting challenging content.
Koster's analysis describes the level race as a repeated activity/recovery cycle
with enforced downtime.

- [*World of Warcraft* game manual](https://bnetcmsus-a.akamaihd.net/cms/template_resource/263A8NGR8HLZ1556919642368.pdf), Blizzard Entertainment, 2004–2005 second-edition file, physical PDF p. 174.
- [Updates to Progression Server XP in February's Patch](https://www.everquest.com/news/progression-tlp-experience-xp-february-2016), EverQuest/Daybreak, 2016.
- [On Socialization and Convenience](https://www.raphkoster.com/games/snippets/on-socialization-and-convenience/), Raph Koster.

**Provenance.** Avoid source item names, quantities, quest language, and the
authors' examples. “Repeated advancement work” is the retained abstraction.

**Truth boundary.** Classification may report only typed kill, quest,
experience, and level facts. Spell mutations currently have no typed reward
event, so the projection cannot identify or describe a spell award. It may not
invent training costs, skill decay, build viability, or combat power.

**Disposition:** `canonical_event_classification`, triggered by
`event.type === 'task_started' && event.task.type === 'kill'`, `quest_started`,
`quest_completed`, and `level_gained`.

## 5. Group and loot governance

**Pattern.** Cooperative play produces a second rules layer: leadership,
eligibility, allocation, and procedural disputes over who receives an item.

**Evidence.** EverQuest's official Advanced Looting guide defines master-looter
authority, group/raid coin splitting, direct assignment, free collection, and
need/greed decisions. Blizzard's official looting retrospective explicitly
describes stranger-group social conflict and personal loot as a response. The
WoW game manual likewise assigns group-loot policy to the party leader and
can make members wait their turn.

- [Advance Your Looting](https://www.everquest.com/news/advanced-looting-system), EverQuest/Daybreak, 2015-03-24.
- [Mists of Pandaria Looting Explained](https://worldofwarcraft.blizzard.com/en-us/news/4736886/dev-watercooler-mists-of-pandaria-looting-explained), Blizzard Entertainment, 2012-03-27.
- [*World of Warcraft* game manual](https://bnetcmsus-a.akamaihd.net/cms/template_resource/263A8NGR8HLZ1556919642368.pdf), Blizzard Entertainment, 2004–2005 second-edition file, physical PDF p. 136.

**Provenance.** Exact loot-mode names, formulas, UI, commands, guild policies,
and the source articles' comic examples are excluded. Use only generic
eligibility, leadership, and allocation language.

**Truth boundary.** A fictional allocation process may classify an actual
`item_gained` or `equipment_gained` event. It may not claim that the item was a
drop rather than a source-neutral receipt, or claim real competitors, rarity
odds, source bosses, attendance, or combat value.

**Disposition:** `mechanics_neutral_incident` for #154, attached to typed loot
or equipment events. Actual parties, competition, raid eligibility, locks, or
persistent guild state belong to #155.

## 6. Vendor and storage friction

**Pattern.** Loot creates clerical work: encumbrance, sorting, restricted buyers,
price friction, storage limits, recurring fees, and stock maintenance.

**Evidence.** CircleMUD's shop format defines what each shop will buy, refusal and
affordability cases, opening hours, and buyer restrictions; its general feature
document records normal, forced, and crash-protected rent. Ultima Online's
official player-vendor guide requires contracts, fees, pricing, stock limits,
cash collection, renewal, and inventory reclamation. Koster describes the UO bank
as an obligatory inventory stop dominated by interface work and sales noise.

- [CircleMUD Builder's Manual: Shop Files](https://www.circlemud.org/cdp/building/building-7.html), CircleMUD project documentation.
- [CircleMUD General Information](https://www.circlemud.org/general.html), CircleMUD project documentation.
- [Player-Owned NPCs](https://uo.com/wiki/ultima-online-wiki/gameplay/npc-commercial-transactions/npcs-player-owned/), *Ultima Online* official guide.
- [On Socialization and Convenience](https://www.raphkoster.com/games/snippets/on-socialization-and-convenience/), Raph Koster.

**Provenance.** Do not reuse currencies, fee schedules, vendor commands, refusal
copy, trade restrictions, shop names, or advertisements.

**Truth boundary.** Progress Quest can report its own encumbrance-driven market
trip, generic sale, gold, and equipment purchase. `inventory_sold` lacks the sold
item and quantity, so later copy must remain generic. No auction, maintenance fee,
remote bank, or spell-training service exists.

**Disposition:** `canonical_event_classification`, triggered by
`event.type === 'task_started'` with `event.task.type` equal to
`heading_to_market`, `selling`, or `buying`, plus `inventory_sold` and
`equipment_purchased`.

## 7. Encounter spillover

**Pattern.** Aggression or encounter ownership escapes its intended boundary and
turns somebody else's nearby fight into an operational incident.

**Evidence.** EverQuest's official Oakwynd explanation says encounter locks were
introduced to mitigate kill-stealing and training, and defines how outsiders,
groups, and an NPC leaving combat interact with that ownership. Blizzard's
official Classic Hardcore rules identify deliberately dragging dangerous
creatures into other areas or causing group wipes as prohibited disruption.
CircleMUD's world/zone documentation demonstrates the older underlying model of
roaming aggressive mobiles plus periodic repopulation.

- [Oakwynd Now Live: Encounter Lock System](https://www.everquest.com/news/eq-oakwynd-now-live), EverQuest/Daybreak, 2023-05-24.
- [Rules of Engagement: Classic Hardcore is Coming to World of Warcraft](https://worldofwarcraft.blizzard.com/en-us/news/23973734/), Blizzard Entertainment, 2023-06-28.
- [CircleMUD Builder's Manual](https://www.circlemud.org/cdp/building/building.html), CircleMUD project documentation.

**Provenance.** Avoid famous warnings, named zones, incidents, policies, exact
commands, and game-specific aggro or ownership terminology.

**Truth boundary.** Current `task_started.kill` does not retain typed opponent
quantity, passing-adventurer status, or an encounter role; those facts exist only
inside rendered descriptions or generator-local values. Parsing that text is
forbidden. No damage, wipe, lock, interference, or connected participant exists.

**Disposition:** `mechanics_neutral_incident` for #154 **after** existing
canonical opponent quantity/passer facts are exposed as typed presentation
metadata. Actual aggro, wipes, ownership, or encounter locks belong to #155.

## Current typed-event mapping

The modern engine already emits twelve `GameTransitionEvent` variants. Safe
classifications and projections are:

| Typed fact | Safe historical classification | Prohibited inference |
| --- | --- | --- |
| `level_gained`, `stat_gained` | advancement paperwork | build viability or combat power |
| `quest_started`, `quest_completed` plus typed quest state | repeated assignment and turn-in | a contested camp without exact repeat evidence |
| `save_requested` | local checkpoint request | completed persistence, server save, rollback, or remote persistence |
| `item_gained`, `equipment_gained` | loot award | rarity, source, competition, or combat effect |
| `gold_received` | currency receipt | inflation, auction activity, or payer identity |
| `inventory_sold` | generic vendor disposal | sold item or quantity |
| `equipment_purchased` | procurement | negotiation, scarcity, or service availability |
| `act_completed` | act milestone | boss or raid proof |
| `event.type === 'task_started' && (event.task.type === 'heading' \|\| event.task.type === 'heading_to_market')` | travel/market transition | additional duration, fare, or route |
| `event.type === 'task_started' && (event.task.type === 'selling' \|\| event.task.type === 'buying')` | commerce transition | sold item, quantity, negotiation, or scarcity |
| `event.type === 'task_started' && event.task.type === 'kill'` | generic hunt | parsed opponent/training claims |
| `event.type === 'task_started' && (event.task.type === 'cinematic' \|\| event.task.type === 'act_marker')` | cinematic/act administration | specific boss, raid role, or victory claim |

`advanceGame` emits these typed facts chronologically, but one call may emit a
batch with only the final state retained for the whole batch. `gameStore.tick`
then renders each fact to a string and only afterward assigns the stable
`ActivityEntry.id`. #154/#153 must project before the facts are flattened and
must add event-local typed context—either a snapshot captured at the event or an
enriched event payload—alongside stable identity. Pairing every event with the
batch's final state can leak later facts and mismatch earlier events. Rendered
activity strings are not a data contract.

## Future local playerbase source

This source remains dormant until independent local reports over time establish
a recurring aggregate pattern. If that ever happens:

1. Treat every individual report as product evidence, never content.
2. Establish recurrence across independent reports or periods; duplicates,
   campaigns, and reaction counts are not enough.
3. Remove identity, wording, circumstances, timestamps, and unnecessary detail.
4. Record only the aggregate product fact and its actual remediation status.
5. Write new expression under #146. A patch note may claim a fix only after the
   corresponding change is merged and verified.

Never automatically ingest, scrape, count, summarize, transform, or publish
issues, discussions, email, diagnostics, or security reports. Private material,
secrets, personal data, harassment or hate, health, legal, or financial claims,
unresolved disputes, and vulnerability details are permanently excluded from
this comedy lane. Security reports remain private through coordinated disclosure
and may be considered only after remediation and a separate safe-content review.
This catalog creates no telemetry, feedback form, GitHub API integration,
database, runtime AI, or content-generation dependency.

Accessibility needs and novice confusion are product evidence, never punchlines.
Simulated burdens happen to the hero, not the observer: no extra clicks, focus
theft, live-region noise, deceptive multiplayer presence, manufactured outage,
or unbounded delay. Any eventual surface must preserve the #146 contract,
including keyboard and screen-reader operation, 320 px reflow, 400 percent zoom,
reduced motion, and quiet assistive-technology behavior.

## Hand-off

- #154 may consume the safe classifications and mechanics-neutral dispositions;
  it owns any later project-authored incident text.
- #153 owns the bounded simulated transcript and must retain typed-event
  provenance instead of parsing activity prose.
- #155 owns any authoritative death, penalty, competition, raid, travel, market,
  combat, or persistent-social rule.
- #175 remains after the deterministic authored chat baseline and may never use a
  local model to invent authoritative state.

The seven-record catalog is deliberately small. Repetition and callbacks should
make it feel coherent; adding weakly sourced categories would only produce a
larger, less trustworthy joke bag.
