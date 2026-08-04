# Zero-player MMO and MUD loop — 2026-08-04

## Recommendation

Build the feeling of a complete MMO lifecycle in two layers:

1. Restore the missing canonical Progress Quest loop, then project towns, hunting
   grounds, dungeons, raid milestones, rarity, and fully simulated social theater
   from authoritative typed events.
2. Decide any new raid, loot, spell-shopping, or persistent-world mechanics as an
   explicit post-parity ruleset rather than quietly changing the classic engine.

The guiding rule is:

> Simulate the burdens on the hero, not on the observer.

Every apparent participant is fictional and local. Guild chat, world chat, party
and raid chatter, whispers, NPC remarks, system messages, and the protagonist's
own dialogue and replies are all produced by the simulation. No human is online,
no message is sent, no input box is needed, and no runtime model is involved.

## Observer user story

An observer opens the PWA and can understand the current loop at a glance:

```text
hunting ground
  → monster and quest grind
  → level or encumbrance threshold
  → automated travel to town
  → sell loot, buy equipment, certify training
  → travel to the next hunting ground
  → dungeon or act-boss milestone
  → raid and loot bureaucracy
  → progress continues regardless
```

The activity record remains the mechanical truth. A separate bounded world/social
projection explains where the character is, what genre ritual is occurring, and
how the entirely imaginary community reacts to it.

## What classic Progress Quest already does

The baseline already contains most of the economic and progression loop:

- `pq-web-src/newguy.js:112-145` begins at Act 0 with a queued prologue.
- `pq-web-src/main.js:291-361` sends an encumbered hero to market, sells one
  inventory stack at a time, optionally buys equipment under a strict gold gate,
  then returns to the killing fields.
- `pq-web-src/main.js:666-729` completes quests, grants one of four reward kinds,
  and starts another quest.
- `pq-web-src/main.js:875-884` levels the hero, raises HP and MP maxima, grants two
  stats and one spell, and resets experience progress.
- `pq-web-src/main.js:138-173` queues interplot story sequences, including a named
  boss struggle.
- `pq-web-src/main.js:795-807` completes the act and grants item and equipment
  rewards after Act I.

The baseline has no damage, mitigation, spell-casting, death, party, raid,
lockout, or legendary-drop system. Equipment and spells are progression trophies,
not combat inputs. Observer copy must not claim otherwise.

## Modern seams and prerequisite gaps

`src/engine/transition.ts` is the authoritative pure transition seam and emits
typed facts. `src/state/gameEventAdapter.ts` converts those facts into display
copy, and `src/state/gameStore.ts` retains a bounded activity log.

The observer work must wait for these corrections:

- #138 restores random-star loot.
- #139 restores market value and item-by-item sale sequencing.
- #141 restores the strict equipment-purchase gate.
- #150 restores the Act 0 prologue, interplot cinematics, act completion, and
  resumable sequence state.
- #48 supplies stable event identities and accessible announcement behavior.

Today the modern port collapses the trip and sale into one task, sells all stacks
at once under a different formula, buys at `>=` rather than the legacy `>` gate,
and lets plot progress saturate without completing an act. Building world fiction
on that sequence first would make the wrong behavior harder to remove.

## Primary-source inspiration

The aim is to reproduce genre structure, not donor content.

- An official EverQuest anniversary retrospective preserves community memories of
  corpse recovery, raid death loops, camps, trains, buff coordination, and raid
  chatter. Together those recollections support the pattern of inconvenience
  becoming social ritual without licensing any line for reuse
  ([EverQuest anniversary retrospective](https://www.everquest.com/news/imported-eq-enus-51393)).
- Ultima Online's official documentation makes guarded towns, spoken NPC commands,
  vendors, banking, travel, and commercial searches part of the world loop
  ([NPC communication](https://uo.com/wiki/ultima-online-wiki/beginning-the-adventure/communicating-with-npcs-and-other-commands/),
  [vendor search](https://uo.com/wiki/ultima-online-wiki/gameplay/npc-commercial-transactions/vendor-search/)).
- Blizzard's official WoW Classic primer presents dungeons and raids as named
  destinations with level ranges and physical entrances, supporting a legible
  progression from outdoor hunting to group-scale milestones
  ([WoW Classic primer](https://worldofwarcraft.blizzard.com/en-us/news/23090134/wow-classic-primer-for-new-players)).
- Richard Bartle's primary MUD analysis treats leveling and treasure, exploration,
  social communication, and player conflict as interdependent motivations. It is
  especially useful here because Progress Quest can simulate all four while
  requiring none of them from a real player
  ([Players Who Suit MUDs](https://mud.co.uk/richard/hcds.htm)).

Use generic concepts such as town, guild, camp, train, dungeon, raid, world
channel, vendor, and loot council. Do not copy zone names, NPCs, dialogue, art,
maps, encounter rules, UI trade dress, catchphrases, or community anecdotes.

## Domain contracts

### 1. Authoritative activity remains authoritative

With observer features enabled or disabled, the engine must return identical:

- character and progression state;
- ordered canonical events;
- remaining elapsed time;
- saved data and checkpoint behavior;
- final gameplay RNG state.

World and social projection must never parse rendered log strings. It consumes a
stable typed event plus the post-transition snapshot.

### 2. World context is a projection before it is state

The first world model is a pure, bounded classification:

- **venue:** field, road, town, dungeon, raid, or cinematic;
- **location label:** original deterministic name derived without gameplay RNG;
- **activity:** travel, hunt, quest, sell, buy, train, boss, or administration;
- **source:** event identity and the authoritative fact that earned the label.

A level gain can project a departure and arrival into a new hunting ground.
Market events project the exact town sequence. Quest kind can classify travel or
dungeon work. Restored act cinematics can earn boss or raid framing.

No world graph, pathfinding, second timer, or persisted location is needed until a
real mechanic demonstrates that a projection is insufficient.

### 3. Social theater is explicitly simulated

One read-only surface may contain entries with:

- stable identity;
- channel enum;
- fictional speaker role;
- bounded display name;
- bounded plain-text utterance;
- source event identity;
- an explicit marker for the hero's automatic speech.

The surface must plainly state that no people are online and no messages are sent.
It has no text input, typing indicator, read receipt, online count, moderation
claim, generated link, HTML, Markdown, or network behavior.

The protagonist is an active simulated participant. Their automatic voice may use
safe character facts such as class, race, level, quest kind, venue, and editorial
register. It must remain mechanically truthful and cannot stereotype real groups.

### 4. Cosmetic variety never consumes gameplay RNG

Use fixed mappings first. If variation earns its cost, choose from a finite,
reviewed catalog with a stable hash of event identity and bounded character facts.
Never call the engine `RandomGenerator`, `Math.random`, a clock, a server, or a
runtime model. Cosmetic generation must not shift the next monster, quest, item,
reward, or saved Alea tuple.

### 5. Activity and chatter have separate bounds

Simulated chatter cannot evict canonical activity from its current 50-entry log.
Use one separately bounded collection or a derived view with explicit per-event
and total-entry caps. Catch-up bursts summarize social reactions while preserving
every authoritative event.

The social region defaults to `aria-live="off"`. #48 remains responsible for
announcing only new, important canonical activity. Preserve reader scroll
position, visible focus, keyboard filtering, touch use, 320px reflow, 400 percent
zoom, forced colors, reduced motion, and long Unicode-name wrapping.

## Consensus decision

The review compared three options:

- **A — observer-first:** derive world and social theater from canonical typed
  events, then decide mechanics later.
- **B — integrated expansion now:** add zone, raid, loot, shop, and social state to
  the authoritative engine before parity is complete.
- **C — copy only:** add disconnected flavor strings with no typed world seam.

The canonical-loop reviewer and UX/spec reviewer voted for A. The standards and
security reviewer also selected the observer-only boundary represented by A,
with the added requirement that social theater remain a one-way projection rather
than a second agent loop. The primary agent agrees. Result: **4–0 for A**.

A delivers the requested journey, simulated inhabitants, and automatic hero
responses without changing the next canonical monster or save. B is preserved as
the explicit #155 decision instead of being rejected. C was rejected because
unstructured copy cannot support truthful sequencing, stable callbacks, or
accessible filtering.

## Turning gripes into experiences

#148 owns evidence and curation. #154 owns the conversion into automated hero-side
incidents. The source grievance should be recognizable as a genre pattern, but
the shipping expression and event must be original.

Promising mechanics-neutral mappings include:

| Genre pattern | Existing fact | Safe simulated experience |
| --- | --- | --- |
| Vendor-trash pilgrimage | Encumbrance and market tasks | Town travel, appraisal paperwork, sale chatter, and automatic relief |
| Camp checks and contested targets | Repeated quest targets and named passersby | Simulated camp etiquette and jurisdictional dispute with no reward change |
| Monster train | Multi-monster quantity | A train notice and social reaction without additional opponents or duration |
| Loot council politics | Equipment or item reward | Minutes unanimously awarding loot to the only eligible attendee |
| Raid attendance and buff coordination | Restored act-boss cinematic | Quorum, preparation, and aftermath theater around the canonical sequence |
| Level congratulations | Level event | A short simulated congratulations chain and automatic hero response |
| Auction and vendor noise | Market sale or purchase | Bounded world-channel commerce and procurement commentary |
| Maintenance windows | PWA update event | Change-control theater without making the site unavailable |

Death, XP loss, corpse recovery, wipes, lockouts, class balance, combat spells, and
loot competition are not existing mechanics. They may appear as plainly fictional
bureaucracy, or wait for #155; they cannot be reported as real system effects.

## Rarity, raids, and town services

The observer-first layer can do more than generic flavor without adding mechanics:

- Equipment generation quality already has an authoritative equation. A rarity
  label can be derived from that score while continuing to disclose zero combat
  contribution.
- The classic interplot boss sequence and later-act item/equipment rewards can be
  framed as a raid milestone and raid drop without changing their timing or odds.
- Spells actually granted by a level or quest can be presented as being certified
  or trained in town, provided the event still says how the spell was acquired.

Actual legendary drop tables, spell purchases, consumable items, raid lockouts,
boss stats, persistent guild relationships, or conversation memory are new rules.
#155 must decide whether they belong in an opt-in expansion, a new sequel ruleset,
or nowhere. A breaking serialization decision requires unanimous approval.

## Backlog and dependency order

| Order | Issue | Purpose |
| ---: | --- | --- |
| 1 | #138, #139, #141, #150 | Restore the authoritative loop and boss foundation |
| 2 | #48, #143, #146, #147, #148 | Stable identity, provenance, voice, truth, and source catalog |
| 3 | #144 | Disposable world-chronicle and screen-space proof |
| 4 | #152 | Derived zones, towns, dungeons, raid framing, and rarity |
| 5 | #153 | Fully simulated channels and automatic hero replies |
| 6 | #154 | Curated gripes as automated hero incidents |
| 7 | #155 | Explicit post-parity mechanics and save decision |

#151 is the coordinating epic. #37 continues to own legacy modernization and must
not be declared complete before #150 is resolved.

## Verification gates

- Fixed-seed feature-on/off fidelity traces and final RNG equality.
- PQW and active-checkpoint compatibility.
- Deterministic catalog output with no clock, entropy, network, or runtime model.
- Exhaustive catalog bounds, source-name/catchphrase collision tests, and
  mechanical-truth assertions.
- Catch-up burst and long-session memory/DOM bounds.
- Keyboard, touch, scroll retention, one-screen desktop, 320px, 400 percent zoom,
  forced colors, reduced motion, offline, and no-extra-network E2E coverage.
- Plain-text rendering and hostile Unicode/bidirectional character-name tests.
- Independent standards and specification review before implementation PRs merge.
