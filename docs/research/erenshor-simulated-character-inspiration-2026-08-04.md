# Erenshor simulated-character inspiration — 2026-08-04

## Recommendation

Use Erenshor as evidence that a faux MMO becomes convincing through a recurring
cast with visible roles and continuity, not through an infinite supply of chat
lines. Adapt that principle to Progress Quest as a much smaller, read-only event
projection:

- a finite recurring Guild of Zero cast;
- stable personalities, roles, competence, and petty preoccupations;
- apparent progress tied transparently to the hero's real milestones;
- short event-caused scenes that include the hero's automatic reply;
- permanent disclosure that every participant is fictional and local;
- no runtime model, network, second tick loop, or hidden persisted society.

Erenshor is a full single-player RPG with real combat, party control, social
choices, and persistent simulated characters. Progress Quest is not. The useful
lesson is the shape of believable continuity; its mechanics and content are not a
drop-in design.

## Primary-source snapshot

This review reflects the project as documented on 2026-08-04. Erenshor remains in
Early Access and its details can change.

- The [official site](https://www.erenshor.com/) presents the game as single-player
  and never online. Its simulated companions have personalities, skill levels,
  independent-looking progression, and a design goal of remaining available
  rather than leaving the player behind.
- The [official Steam page](https://store.steampowered.com/app/2382520/Erenshor/)
  describes simulated characters who progress, acquire and trade items, join and
  leave guilds, invite the player to raids, remember treatment, and use prewritten
  personalities and motivations. It also states that their behavior uses state
  machines and decision trees rather than an LLM.
- The [official player guide](https://www.erenshor.com/gallery/ESPPG.pdf) shows
  simulated characters appearing to adventure, chat, quest, group, fill party
  roles, request loot, and participate in a town-centered economy. It is explicitly
  all-rights-reserved and may be used here only as factual design evidence.
- The [official Steam announcements](https://steamcommunity.com/app/2382520/announcements/)
  show a raid UI with group roles and filtered world, battle, and zone events.
  They also document a save/load sequencing bug that could lose simulated-player
  progression while missing UI made the loss harder to detect.

No source code or license grant for reuse was identified. Erenshor, its character
and location names, dialogue, lore, item and encounter rules, art, UI expression,
and the branded `SimPlayer` term must not be copied. This note extracts abstract
product and engineering lessons only.

## Transferable lessons

### 1. Recurrence beats population size

Erenshor's simulated population is composed of recognizable characters with fixed
identity and personality. That permits familiarity, favorites, and expectations.
Progress Quest should not generate an endless disposable username stream.

Start with a small, finite cast derived deterministically for each hero. A cast
member earns another appearance because an authoritative event fits their role,
not because a background timer says the world needs activity.

### 2. A persona needs an operational reason to speak

Each fictional participant should have a compact, inspectable profile:

- **guild role:** officer, quartermaster, raid lead, healer, tank, scout, broker;
- **temperament:** officious, fatalistic, optimistic, suspicious, overprepared;
- **competence:** confidently wrong, accidentally excellent, adequately certified;
- **preoccupation:** camps, loot rules, travel, buffs, attendance, market prices;
- **voice constraint:** terse vocabulary and a finite approved register.

These fields select from reviewed copy. They do not drive combat, loot, quests, or
the canonical RNG stream.

### 3. Apparent progress should remain level-compatible

Erenshor lets its cast appear to progress independently while remaining useful to
the real player. Progress Quest can create the same impression more cheaply:

- derive a cast member's displayed tier from hero level, act, and stable identity;
- mention their offscreen paperwork only when the hero crosses a real milestone;
- never run a second progression loop or claim an inventory, spell, or achievement
  that the application cannot inspect;
- label any status as fictional world context, not authoritative character state.

If persistent relationships, inventories, guild membership, or exact cross-reload
social history later earn their cost, #155 must specify versioning, visibility,
diagnostics, migration, and recovery before implementation.

### 4. Role behavior is more legible than generic personality

Erenshor's group members fill recognizable party roles. Progress Quest has no
party combat, so its cast should fill *administrative* versions of those roles:

- the tank files first claim on all blame;
- the healer certifies that morale was within tolerance;
- the raid lead schedules an instant 0/0 muster;
- the quartermaster operates a loot council with one eligible recipient;
- the scout discovers the zone the hero was already entering;
- the broker values vendor trash in units of future disappointment.

These are original prompts for the project's own voice, not shipping lines and not
references to Erenshor characters.

### 5. Social consequences should attach to real events

Erenshor connects grouping, loot, commerce, guilds, and raids. The lightweight
Progress Quest equivalent is a bounded scene caused by one typed fact:

- level event → congratulations, automatic hero reply, registrar ruling;
- town arrival → broker chatter, sale, procurement opinion;
- equipment reward → loot-council decision and literal quality summary;
- quest target repetition → camp check and jurisdiction dispute;
- restored act boss → raid muster, preparation, aftermath, reward record;
- zone transition → scout report and hero acknowledgement.

Each scene should contain two to four messages, including the hero when a response
is warranted. The final mechanical line remains literal and authoritative.

### 6. Channels are filters, not separate simulations

Erenshor's current raid work distinguishes world, battle, and zone events. For
Progress Quest, Guild, World, Party, Raid, Whisper, System, and Hero are typed
labels over one bounded collection. They do not each retain a separate log, timer,
or state machine.

Present the projection in the shared World Console specified by #159: Chatter is
the default tab, while Activity remains the always-available authoritative record.
The two streams stay structurally separate, retain independent reading positions,
and scroll inside the dashboard rather than growing the page. Following the newest
entry is conditional on the reader already being at the latest edge. Chatter
remains `aria-live="off"`; #48 announces only important canonical facts, including
while Activity is inactive. Channel, speaker, fictional status, and authoritative
status cannot rely on color alone.

### 7. The hero is also simulated

Erenshor permits the human player to whisper, group, assign roles, and decide how
to treat companions. Progress Quest must automate all of those decisions. The
hero's response is generated by the same finite projection as every other line and
is visibly marked automatic.

No text box, choice prompt, relationship optimization, or manual loot decision is
needed. #147 may explain the authoritative reason when a real automated decision
exists; social copy must not invent one.

### 8. State must be visible before it is persistent

Erenshor's published save/load defect is a useful engineering caution: hidden
simulated-character progression can fail silently and becomes another recovery
surface. The Progress Quest prototype therefore persists no cast inventory,
relationship score, guild history, location, or conversation memory.

If #155 later approves such state, requirements include:

- a versioned and Zod-validated boundary;
- an inspectable UI for every consequential field;
- deterministic replay and migration tests;
- bounded diagnostics and user-controlled recovery;
- no effect on the classic PQW v0 ruleset without unanimous approval.

## Recommended original cast grammar

Use composition to produce bounded identity without a combinatorial joke cannon:

```text
stable name + administrative party role + temperament + one preoccupation
```

The finite catalog should prefer roles with a reason to recur. Candidate concepts
for content review include:

- a raid leader whose only demonstrated skill is agenda punctuation;
- a healer who treats mana as a reimbursement category;
- a tank who regards aggro as certified correspondence;
- a loot officer who has recused everyone except the hero;
- a chronic alternate character who considers incompletion a portfolio;
- a broker who prices every object against projected regret;
- a scout who reports destinations immediately after arrival;
- an optimist who describes each procedural collapse as a clean pull.

Do not bind protected traits, real cultures, or novice behavior to incompetence.
Catalog tests should reject source names, catchphrases, unsafe combinations,
unbounded lines, and mechanical claims unsupported by the engine.

## Backlog impact

- **#153:** add a small recurring cast, finite persona fields, deterministic
  milestone-compatible status, two-to-four-line scenes, and automatic hero replies.
- **#152:** allow cast roles to reappear across derived town, field, dungeon, and
  raid venues without becoming world state.
- **#154:** use cast preoccupations to react to researched genre gripes while the
  institution and system remain the punchline.
- **#155:** own any persistent relationships, inventories, guild membership,
  offscreen progression, or social memory, including visibility and recovery.
- **#143:** record Erenshor as all-rights-reserved inspiration with no code or
  content reuse authorization identified.
- **#159:** prototype one bounded World Console with default Chatter and a distinct
  authoritative Activity tab before #153 claims permanent dashboard space.
- **#157:** treat Erenshor as one focused case study inside the broader post-2002
  MMO and game-design survey; do not let it dominate the comparison set.

The correct near-term result is not “build Erenshor in a browser.” It is a
Progress Quest event adapter whose small fictional guild appears to have a life,
despite having no state, agency, network, or excuse.
