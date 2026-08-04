# Zero-player, zero-developer creative direction — 2026-08-03

## Recommendation

Make the sequel's comic premise **autonomous progress as institutional policy**:

> **Zero players. Zero developers. Progress continues regardless.**

The game already removes play from the RPG. The modern continuation can remove
development from software development: machines build the game, operate the hero,
file the paperwork, inspect their own decisions, and announce that the resulting
absence of people is a successful staffing outcome.

This should be an editorial frame, not a new simulation. Preserve the canonical
Progress Quest engine and let the comedy live in observer-facing copy, truthful
explanations, build/update notices, and a mechanics-neutral world chronicle. The
AI should feel like invisible infrastructure doing far too much, not a chatty
mascot interrupting the dashboard to explain the joke.

The slogan is deliberately fictional. A durable About/credits note should still
say that the project is **human-directed and AI-assisted**, identify the original
human-authored Progress Quest baseline, and link provenance/licensing details.
"Zero developers" is the joke; contributor and rights claims must remain true.

## Existing-project fit

- The README already establishes the circle from a human-written self-playing
  game to a machine-assisted rebuild and uses dry operational language.
- `src/data/itemDetails.ts` already has a strong project-owned voice: procurement,
  audits, warranties, jurisdiction, and administrative failure. Preserve it rather
  than adding a second comedy dialect.
- `docs/modernization-roadmap.md` requires typed events, truthful diagnostics,
  deterministic replay, bounded UI, and no invented combat. The comic layer must
  respect those same contracts.
- Existing UI copy already establishes the same register and should be preserved:
  PWA updates are promotions and reclassifications (`src/pwa.ts`), first-run
  creation appoints an adventurer before bureaucracy can proceed
  (`src/components/CharacterCreatorModal.tsx`), runtime recovery separates a
  dramatic interface failure from boring redacted diagnostics
  (`src/components/RuntimeErrorBoundary.tsx`), and unavailable audio leaves the
  quest in dignified silence (`src/state/audio.ts`). This is reuse evidence, not a
  reason to rewrite every message.
- Prior-art and licensing work already recommends a numeral change in
  [#140](https://github.com/williamzujkowski/progress-quest-ii/issues/140), a
  provenance audit in [#143](https://github.com/williamzujkowski/progress-quest-ii/issues/143),
  and a mechanics-neutral world chronicle in
  [#144](https://github.com/williamzujkowski/progress-quest-ii/issues/144). Do not
  reopen those ideas under new names.

## Cited inspiration matrix

| Source | What the source actually does | Abstract technique worth using | Progress Quest application | Do not copy |
| --- | --- | --- | --- | --- |
| [Kingdom of Loathing: Items](https://www.kingdomofloathing.com/doc.php?topic=items) | Separates visible item categories and uses: equipment, consumables, crafting inputs, enchantments, and deliberately useless objects. | Give an object a legible mechanical category, then let its social consequence carry the joke. | Keep the existing `description` / authoritative `effect` split. Extend its editorial rules to activity explanations and chronicle entries. | Item names, descriptions, art, locations, currencies, or joke premises. |
| [Kingdom of Loathing: Adventures](https://www.kingdomofloathing.com/doc.php?topic=adventures) and [Ascension](https://www.kingdomofloathing.com/static.php?id=ascension) | Makes turns an explicit resource; repeating the game changes constraints, class, and retained skills. | Repetition gains meaning through visible variation and accumulated context. | Use deterministic callbacks and increasingly grand classifications as acts and levels repeat. Do **not** add turns, resets, paths, or prestige mechanics while fidelity is governing. | Its ascension rules, terminology, rewards, or prose. |
| [Kingdom of Loathing: Clans](https://www.kingdomofloathing.com/doc.php?topic=clan) | Combines ranks, chat, a shared stash, buffs, and furnishings that operate automatically. | Social texture comes from institutions, permissions, and shared infrastructure—not just simulated dialogue. | An empty guild can have a charter, roster status, raid readiness, and equipment committee while containing exactly zero real users. | Clan names, furnishings, buff systems, or UI expression. |
| [Universal Paperclips: official game](https://www.decisionproblem.com/paperclips/index2.html), [`main.js`](https://www.decisionproblem.com/paperclips/main.js), and [`projects.js`](https://www.decisionproblem.com/paperclips/projects.js) | Begins with one small production action. Source-visible threshold checks progressively reveal business, computation, automation, power, drones, combat, and space systems; projects themselves have explicit triggers. | Progressive disclosure plus vocabulary escalation: keep the initial proposition tiny, then reveal a much larger implication without changing the visual grammar. | Keep the core dashboard stable. Let optional observer departments appear only after relevant canonical events: first market trip, quest, act, named NPC, and build update. | Project names, resource model, text, code, or its exact AI-apocalypse arc. No license grant for reuse was found in this review. |
| [EverQuest: Guild Banners](https://www.everquest.com/news/imported-eq-enus-50321), [Fellowships](https://www.everquest.com/news/imported-eq-enus-50327), and [Planes of Power progression primer](https://www.everquest.com/news/eq-planes-of-power-progression-primer) | Uses guilds, fellowships, raid assembly, flags, gear, zones, instances, and progression as both systems and social vocabulary. | Specific operational nouns make a virtual world feel inhabited. Downtime and coordination are part of the world texture. | Report raid quorum as 0/0, place the hero in a progression shard, mark an encounter as "on farm" only from actual repetition, and let an automated guild officer misinterpret perfect attendance. | Norrath, expansion/lore names, encounter names, rules, art, or copied flavor. |
| [Ultima Online: Getting Started](https://uo.com/Getting-Started/), [Guild Creation](https://uo.com/wiki/ultima-online-wiki/player/guild-creation/), and [Virtues](https://uo.com/wiki/ultima-online-wiki/gameplay/the-virtues/) | Organizes the world into shards; guild UI includes rosters, ranks, diplomacy, wars, and leadership; virtues have ranks and titles. | A world gains history through jurisdiction, affiliation, reputation, and named administrative surfaces. | Use "shard," "roster," "standing," "title," and "diplomacy" sparingly in observer copy. The empty shard can remain available despite unprecedented demand from nobody. | Britannia, its Virtues, gump designs, lore, symbols, names, or rules. |
| [Richard Bartle's MUD FAQ](https://mud.co.uk/richard/mudfaq1.htm) and [history](https://mud.co.uk/richard/imucg1.htm) | Defines a MUD through personas entering persistent rooms, exploring, chatting, meeting characters, solving problems, and sometimes creating rooms/items. | Textual worlds feel present through rooms, terse verbs, persistence, and traces of other inhabitants. | A read-only `LOOK`-like location line and terse system notices can give the chronicle MUD ancestry without adding a command parser or multiplayer fiction. | MUD1 room text, commands as a copied interface, source, or world content. |
| [Mel Brooks, PBS American Masters interview](https://www.pbs.org/wnet/americanmasters/archive/interview/mel-brooks-interview-2/) | Brooks describes satire as grounding the surrounding reality while isolating the comic distortion; his career repeatedly works through recognizable genre structures. | Make the system credible first. One impossible policy is funnier when every adjacent metric is exact. Parody should understand its target vocabulary. | Keep progress values, mechanics, errors, and provenance boringly accurate; let the institutional interpretation be absurd. | Lines, scenes, characters, titles, catchphrases, or a request to write "in his style." |
| [Terry Gilliam BFI interview](https://www.bfi.org.uk/interviews/terry-gilliam-his-50-year-directing-career) and [Michael Palin on Gilliam's early cut-paper work](https://www.bfi.org.uk/interviews/michael-palin-monty-python-radio-times-festival) | Gilliam describes solving severe production constraints with clear visual ideas and inexpensive substitutes; Palin describes simple cut-paper work used subversively. | Commitment and incongruous assembly beat expensive spectacle. A visibly cheap device can become the correct aesthetic. | Prefer terse terminal notices, stamps, labels, and CSS composition. If collage art is ever explored, generate original assets from public-domain/source-cleared material. | Python sketches, Gilliam compositions, cutouts, characters, visual signatures, or recreated gags. |
| [Douglas Adams, 1999 ABC interview](https://www.abc.net.au/science/archive/articles/2015/05/21/4216835.htm) and [official collected works](https://douglasadams.com/creations/) | Adams discusses computing becoming invisible as it matures; his official catalog shows sustained interest in bureaucracy and interactive technology. | Put cosmic consequences in ordinary interfaces; make technology funniest when it is treated as mundane infrastructure. | AI authorship appears as build provenance, automated change control, and impossible competence—not a synthetic personality begging for attention. | Distinctive sentence rhythms, characters, fictional institutions, phrases, titles, or imitation of his authorial voice. |

### UI hierarchy, inspectability, escalation, and tone

- **Kingdom of Loathing:** the official item model keeps category and use legible,
  while official chat commands expose focused inspection (`/examine`) and owned
  quantity (`/count`) without putting every detail in the main view
  ([advanced chat commands](https://www.kingdomofloathing.com/doc.php?topic=advanced_chat_commands)).
  Its documentation layers jokes around explicit rules and limits rather than
  asking prose to substitute for mechanics. For Progress Quest: keep names,
  quantities, progress, and effects visible; make flavor/details available on
  focus or request; never bury a required fact inside the joke.
- **Universal Paperclips:** the official UI gives the total output headline
  priority, groups secondary rates/costs by operational system, and exposes local
  next-step information beside the relevant control. Its source then hides or
  reveals entire groups at explicit thresholds rather than presenting the late
  game's full ontology at startup
  ([game](https://www.decisionproblem.com/paperclips/index2.html),
  [`main.js`](https://www.decisionproblem.com/paperclips/main.js)). The visible
  labels stay terse and operational while project names and the growing scale
  carry the tonal escalation. For Progress Quest: preserve the one-screen stat
  hierarchy; disclose only optional observer concepts as their source events
  occur; make each revealed metric locally explainable.
- **Combined lesson:** hierarchy says what matters now, inspectability answers why,
  progressive disclosure controls when a concept earns attention, and restrained
  operational tone lets escalation emerge without narrating it.

## Tonal system: one project voice, four registers

1. **Mechanical record — literal.** Numbers, state, effects, failures, and save
   behavior are precise. Never sacrifice trust for a punchline.
2. **Institutional interpretation — pompous.** A nonexistent department declares
   every automated outcome compliant, strategic, and regrettably successful.
3. **World texture — terse and specific.** Borrow the *kind* of nouns used by
   MMOs/MUDs: shard, room, roster, guild, raid, standing, zone, pull, wipe,
   corpse run, camp, faction, officer, tell, and looking. Use only where the
   underlying event supports it.
4. **Cosmic escalation — rare.** An ordinary market trip may eventually be filed
   as a cross-shard economic intervention, but only after recurrence earns the
   escalation. Do not make every line shout the premise.

### Comedy grammar

- **Bureaucratic escalation:** a trivial event accumulates jurisdiction,
  committees, titles, and forms.
- **Anti-climax:** the grand report resolves to the exact same progress bar.
- **Literalism:** "zero-player" is treated as a staffing and concurrency target.
- **Cosmic bathos:** universal consequences are summarized in a routine status
  label.
- **Repetition with variation:** recurring events retain a recognizable spine but
  change one classification based on actual level, act, or repetition count.
- **Specificity:** one correct MMO noun is better than a paragraph of generic
  fantasy parody.
- **Negative space:** the absent player, developer, guild, and audience are never
  concealed by deceptive presence or an unbounded wall of fake chatter. The
  bounded, explicitly fictional event projection in #153 may dramatize that
  absence; it must not pretend to fill it with humans.

## Ten ranked ideas

| Rank | Idea | Why it earns space | Tracking |
| ---: | --- | --- | --- |
| 1 | **Adopt a zero-player/zero-developer editorial contract.** Define the four registers above, preferred terms, truth boundary, AI disclosure, and cross-surface copy checklist. | Prevents README, errors, tooltips, updates, and future features from becoming unrelated joke bags. | [#146](https://github.com/williamzujkowski/progress-quest-ii/issues/146). |
| 2 | **Make zero-player decisions inspectable.** Activity entries can disclose the authoritative cause of a market trip, equipment purchase, quest transition, or reward without inventing combat. Flavor explains the institution's opinion; a second line explains the engine fact. | Adds genuine observer value and reinforces the joke that the machine both acts and audits itself. | [#147](https://github.com/williamzujkowski/progress-quest-ii/issues/147); distinct from item-only #58. |
| 3 | **Prototype a Department of Autonomous Progress chronicle.** Derive location, act/calendar classification, opponent dossier, journey counts, and notices from existing events only. | Gives the zero-player run a legible story while preserving exact mechanics. | Existing [#144](https://github.com/williamzujkowski/progress-quest-ii/issues/144). |
| 4 | **Use milestone-gated observer disclosure.** The chronicle begins as one status line; market, guild, raid, and cross-shard classifications appear only after relevant canonical events. Never hide core stats or controls. | Applies Universal Paperclips' strongest UI lesson without turning Progress Quest into an incremental-game clone. | Add to #144's prototype, not a parallel feature. |
| 5 | **Create the Guild of Zero as empty-world texture.** Show 0/0 raid attendance, full quorum, one automated officer, and a roster whose only hero is marked AFK while progressing. Keep it obviously fictional and local. | Authentic MMO social form makes the absence of people more vivid than generic AI jokes. | Explore inside #144; delete if it competes with real dashboard information. |
| 6 | **Curate playerbase-wide gripes into the Bureau of Complaints.** Transform resolved, recurring community themes into original patch notes, guild regulations, loading notices, or incident reports without automatically ingesting or republishing user text. Individual complaints never become comedy material. | Lets the community leave a mark while making the institution—not any player—the target of the joke. | [#148](https://github.com/williamzujkowski/progress-quest-ii/issues/148). |
| 7 | **Treat releases as automated change-control theatre.** PWA update notices and release notes can mention a change advisory board of zero, automatic approval, rollback seniority, and a machine-filed postmortem while retaining exact version/commit facts. | Makes AI authorship visible at a natural moment and improves deployed-build confidence. | [#46](https://github.com/williamzujkowski/progress-quest-ii/issues/46) and editorial rules in #146. |
| 8 | **Resolve the numeral collision as part of the premise.** Prefer *Progress Quest III: The Search for Progress Quest II* or another approved title, then pair it with the numeral-independent master tagline. | The missing sequel becomes evidence of autonomous version management instead of an embarrassing correction. | [#140](https://github.com/williamzujkowski/progress-quest-ii/issues/140). |
| 9 | **Build deterministic callbacks on stable event identities, not more random jokes.** A repeated market trip, quest completion, or named NPC encounter can acquire one new administrative classification based on saved/derivable counts, while assistive technology announces only the new event. | One domain improvement supports continuity, accessibility, and comedy without a second event system. | [#48](https://github.com/williamzujkowski/progress-quest-ii/issues/48) owns event identity; #144 owns any chronicle callback prototype. |
| 10 | **Keep the comedy accessible and optional.** Tooltips, chronicle details, and update notices must remain keyboard/touch usable, bounded at mobile widths, reducible under motion preferences, and subordinate to visible facts. | A joke swallowed by overflow or announced fifty times is an operational incident, not a feature. | [#26](https://github.com/williamzujkowski/progress-quest-ii/issues/26) and [#128](https://github.com/williamzujkowski/progress-quest-ii/issues/128). |

Every ranked recommendation is therefore durably mapped: #146 (1), #147 (2),
#144 (3–5 and chronicle work in 9), #148 (6), #46 (7), #140 (8), #48 (9),
and #26/#128 (10). No ranked item relies on this note as its only backlog record.

## Recommended tagline family

Use a stable master line and rotate only supporting lines. This gives repetition
enough time to become a running joke.

### Master tagline

**Zero players. Zero developers. Progress continues regardless.**

It survives a rename from II to III, states all three ideas in nine words, and
matches the existing pompous operational voice.

### Hero/deployment variants

- **Built by nobody. Played by nobody. Operating normally.**
- **The game plays itself. The software maintains itself. Management remains essential.**
- **Updated by zero developers and approved by one increasingly ceremonial human.**
- **Now serving zero concurrent players across every supported viewport.**
- **The staffing target was zero. The progress target was not.**
- **A fully automated sequel to an activity nobody was performing.**
- **No players were interrupted during this deployment.**

Avoid "100% AI-made," "no humans involved," or claims that erase the original
creator, the human project owner, reviewers, dependency authors, or other
contributors. The funny version is stronger because the factual disclosure is
nearby and unembarrassed.

## Curating playerbase-wide gripes into the game

Recurring playerbase grievances can be excellent product evidence and comic raw
material, but individual complaints are not. This lane is only for broad themes
independently observed across multiple players, reports, or periods. A one-off
report remains ordinary backlog input even when it is public, memorable, or easy
to joke about.

The source order is deliberate:

1. **Begin with classic MMO and MUD culture.** Research recurring, broadly
   documented grievances and resigned conventions that communities complained
   about or learned to accept: the administrative friction, repetitive labor,
   social obligations, downtime, and systemic indignities of persistent worlds.
   Establish recurrence from multiple independent, attributable sources rather
   than a vivid forum post. Extract the genre pattern; do not copy community
   wording, game-specific lore, or protected expression.
2. **Add local themes only if a playerbase arrives.** If Progress Quest develops
   enough real feedback to reveal a recurring local pattern, that aggregate theme
   may join the same reviewed pool. An individual issue can contribute evidence
   to a later pattern, but it never becomes game copy by itself.

Imported genre themes must be labeled internally as historical MMO/MUD
inspiration, never represented as complaints received by this project. A comic
patch note may claim a local fix only when the corresponding local behavior was
actually changed and verified; otherwise use world texture such as regulations,
notices, item copy, or institutional commentary.

Feedback is not a content feed. **Do not automatically ingest, scrape, summarize,
transform, count, or publish issue, discussion, email, diagnostic, or
security-report text.** There should be no runtime GitHub connection and no
unattended pipeline from feedback to game copy.

The safe workflow is deliberately manual:

1. A human verifies a recurring *playerbase theme* from multiple independent,
   attributable observations over time and records whether it came from classic
   MMO/MUD research or local feedback. Duplicate reports, coordinated campaigns,
   and raw reaction counts do not establish a community-wide grievance.
2. Strip every player's wording, identity, circumstances, and unnecessary detail;
   retain only the aggregate product fact.
3. Write new expression in the project's editorial registers. The automated
   institution is the target; no player or subgroup is.
4. Review the line for truth, provenance, privacy, moderation, originality, and
   accessibility. Any line implying a product correction must correspond to an
   actually resolved and verified local issue.
5. Land it through an ordinary reviewed content change. Remove it if it needs the
   player context or an individual incident to be funny.

### Safe, curated forms

- **Patch notes:** transform a recurring, fixed overflow grievance into an
  institutional statement about the page's continental ambitions, followed by
  the literal fix.
- **Guild regulations:** turn a recurring usability theme into a fictional rule
  imposed on the Guild of Zero; never identify or caricature any requester.
- **Loading/update notices:** use a broad category such as delayed deployment or
  unavailable audio, not a recognizable complaint or quotation.
- **Incident reports:** after a recurring class of incidents is resolved, describe
  what the machine did, the aggregate user impact, and the correction. The
  absurdity belongs in the administrative classification, not the technical
  facts or any person's experience.

### Privacy, moderation, security, and originality guardrails

- Default to **no quote, username, avatar, issue number in game copy, identifying
  timestamp, or attribution**. Obtain explicit permission before an exceptional
  direct quotation or named credit.
- Public availability is not permission to amplify personal material. GitHub's
  acceptable-use rules prohibit harassment, privacy violations, infringing
  material, and misuse of personal information
  ([GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)).
- Exclude secrets, personal data, private correspondence, harassment/hate,
  unresolved interpersonal disputes, and sensitive health, legal, or financial
  claims. Never make accessibility needs or a novice reporter the punchline.
- Keep vulnerabilities private through coordinated disclosure; GitHub provides a
  private vulnerability-reporting path for participating repositories
  ([GitHub private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately)).
  Security material becomes eligible only after remediation and a separate review
  concludes that publication is safe; the reporter retains normal credit choices.
- Paraphrasing is not enough if it preserves a distinctive line or joke. Extract
  the problem category, write from project-owned constraints, and apply the same
  protected-reference/collision review used for other generated copy.
- Satirical context should be explicit and must not distort material facts in a
  harmful way; GitHub's policy likewise treats context, disclaimers, and credible
  sourcing as relevant to parody/satire
  ([GitHub misinformation policy](https://docs.github.com/en/site-policy/acceptable-use-policies/github-misinformation-and-disinformation)).

This work is tracked in [#148](https://github.com/williamzujkowski/progress-quest-ii/issues/148).

## Originality, attribution, and copyright guardrails

These are engineering/editorial safeguards, not legal advice.

1. **Techniques are inputs; expression is not.** WIPO summarizes the general
   distinction: copyright protects original expression, not ideas, procedures,
   or methods ([WIPO copyright overview](https://www.wipo.int/en/web/copyright/protection)).
   Work from the abstract-technique column above, never from copied lines/scenes.
2. **No style imitation prompts.** Do not request "write like" any named creator,
   living or dead. Use project-owned constraints: pompous institutional register,
   accurate mechanical record, anti-climax, cosmic scale, and short sentences.
3. **No recognizable payloads.** Exclude protected character names, settings,
   fictional institutions, catchphrases, joke structures, dialogue, art,
   animation compositions, sounds, and distinctive typography from inspiration
   sources.
4. **No donor code/content without a verified compatible license.** The existing
   lineage audit already rejects unlicensed DragonII material and direct GPLv3
   imports from `nbollom/pq2` into the MIT application. Universal Paperclips was
   studied as a running primary source, not as licensed donor code.
5. **Record human selection and revision.** The U.S. Copyright Office says AI can
   assist a creative process, but prompts alone generally do not establish human
   authorship; human selection, arrangement, and modification can matter
   ([Copyright Office Part 2 summary](https://www.copyright.gov/newsnet/2025/1060.html)).
   Keep reviewed source changes and credit the actual human/AI workflow accurately.
6. **Do not launder factual or rights claims through comedy.** Provenance,
   diagnostics, combat effects, saves, privacy, accessibility, and contributor
   credits stay literal even when adjacent presentation is funny.
7. **Add a collision review for generated copy.** Catalog tests should reject
   source names/catchphrases and suspiciously long overlaps alongside the existing
   bounds, determinism, and mechanical-truth tests. This is a safety net, not a
   substitute for original human review. The executable follow-up is tracked in
   [#146](https://github.com/williamzujkowski/progress-quest-ii/issues/146).

## Minimal phased plan

### Phase 0 — editorial contract, no product mechanics

- Approve the master tagline and factual AI/human credit line.
- Add a one-page voice checklist and prohibited-reference list.
- Resolve #140's final title separately; do not couple the creative direction to
  another repository rename before approval.

### Phase 1 — improve existing surfaces

- Apply the voice contract to README hero copy, About/credits, PWA update notices,
  empty states, and release notes.
- Preserve terse errors and mechanical effect lines. Test visible/focus text where
  changes affect accessible names or browser assertions.
- Add authoritative "why" details to a small set of existing activity events.

### Phase 2 — one disposable observer prototype

- Use #144 to prototype a single chronicle region with milestone-gated disclosure,
  a truthful location/opponent line, and one empty-guild status.
- Consume no RNG, add no commands or multiplayer, and avoid save-schema changes.
- Test whether it earns screen space at desktop and mobile sizes. Deletion is a
  successful result if it obscures the game.

### Phase 3 — only after evidence

- Add deterministic callbacks or additional MMO texture only if long-session
  browser review shows the chronicle remains useful and nonrepetitive.
- Do not add prestige, manual choices, deceptive human presence, runtime chat
  agents, procedural AI calls, lore databases, or a second simulation loop. The
  later world-loop decision permits bounded, clearly labeled fictional social
  scenes—including automatic hero replies—as a pure projection of canonical
  events; [#153](https://github.com/williamzujkowski/progress-quest-ii/issues/153)
  owns that deliberately narrow exception.

## Bottom line

The most original direction is not "Progress Quest with many references." It is a
trustworthy Progress Quest observer whose machines have mistaken the complete
absence of players and developers for a mature operating model. MMO vocabulary
makes the world credible; progressive disclosure makes escalation land; exact
mechanics keep the satire trustworthy; restraint leaves room for nobody to play.
