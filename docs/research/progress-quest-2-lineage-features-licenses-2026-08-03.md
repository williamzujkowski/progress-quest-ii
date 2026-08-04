# Prior Progress Quest 2 projects: features and reuse boundaries — 2026-08-03

## Recommendation

Treat both earlier projects as **lineage and feature inspiration, not donor codebases**.

- **DragonII's 2012 Windows game:** no source or license grant was found. “Free game” describes price, not permission to copy. Reuse no executable code, extracted resources, Russian text, screenshots, or generated data.
- **`nbollom/pq2`:** the repository is explicitly GPLv3. Directly copying its code into this MIT project would require GPLv3-compatible distribution of the resulting covered work; do not import it unless the project deliberately accepts that licensing change. Its classic Progress Quest tables and `pq.png` have no separate provenance notices, so do not import those assets/data even as isolated files.
- High-level mechanics and UI ideas may be independently implemented, but the canonical `pq-web-src/` baseline—not either sequel—must remain the behavior oracle.

This is a conservative engineering assessment, not legal advice.

## DragonII, *Progress Quest 2 v1.02* (2012)

### What survives

The only attributable surviving material found is the creator-posted game listing/discussion and three hosted screenshots. The listing identifies DragonII as developer, calls it a Russian Windows “free game,” gives a 0.59 MB size, and says it was updated to v1.02. It describes a sidecar `save.pq2`, configurable autosave interval, and backward-compatible saves. The creator's last visible project comment is dated March 5, 2012; users reported every download mirror dead from 2014 through 2016. No source repository, maintained project page, changelog after v1.02, or working first-party download was found. ([listing and creator discussion](https://small-games.info/?go=game&c=10&i=9794), [creator profile](https://small-games.info/?go=user&uid=99029))

The screenshots and creator comments establish these implemented features:

- character creation with name, race, class, sex, and a preferred STR/DEX/INT “talent”; ([creator screenshot](https://small-games.info/s/f/p/progress_quest_2_3.jpg))
- a compact observer dashboard showing year/day/season, location and location roster, hero and enemy STR/DEX/INT/HP/mana/block, spells and ranks, equipment, inventory, gold, level progress, projected XP, free stat points, current activity, and win/loss counts; ([dashboard screenshot 1](https://small-games.info/s/f/p/progress_quest_2_1.jpg), [dashboard screenshot 2](https://small-games.info/s/f/p/progress_quest_2_2.jpg))
- an event-by-event combat log with damage, spell use, remaining HP, and eventual victories or defeats; and
- automatic equipment selection. DragonII explains that pickup logic compares one item number and equips the item when it is better within an approximately five-point tolerance; the discussion also records that block reduces damage. ([creator discussion](https://small-games.info/?go=game&c=10&i=9794#comments))

Architecture and implementation language cannot be established from screenshots and an unavailable `pq2.exe`; guessing Delphi, C++, or any particular engine would be fiction.

### License and reuse

No EULA, license, source distribution, asset notice, or permission grant was found in the listing, creator profile, comments, or archived URL search. The listing's “free game” classification and public screenshots do **not** authorize copying or derivative works. Therefore:

- **May reuse:** uncopyrightable high-level ideas after independent design—for example, a world calendar, location dossier, or compact opponent summary.
- **May not reuse:** executable code or reverse-engineered implementation, UI artwork, screenshots, Russian prose/names, generated tables, save format, or other packaged assets.
- **Could change only with new evidence:** a verifiable license/readme from the original package or explicit permission from DragonII.

Confidence: **high** on observed features and absence of a license in surviving public material; **medium** on completeness because the original binary/package is unavailable.

## Nicholas Bollom, `nbollom/pq2` / *Progress Quest 2 — The Progression* (2016–2025)

### Features and architecture

The source identifies the program as “Progress Quest 2 - The Progression.” It is a C++23/CMake cross-platform remake with a shared game library and separate GUI layer, plus Qt 6, ncurses, and GTKmm frontends. The README calls the game core, Qt UI, and ncurses UI complete; its “GTK not started” line is stale because the current tree contains a full GTK implementation added in January 2025. ([title](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/main.cpp#L29), [README/status](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/README.md#current-status), [top-level build](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/CMakeLists.txt#L1-L78), [GTK completion commit](https://github.com/nbollom/pq2/commit/3ee3398))

The engine is predominantly a native port of classic Progress Quest: stat/spell/equipment rewards, encumbrance-driven market trips, equipment purchasing, plot cinematics, quests, monster scaling, named NPC encounters, and generated loot all live behind the `Game` interface rather than in a toolkit UI. ([engine interface](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/game/game.hpp), [transition/task implementation](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/game/game.cpp#L178-L704))

Notable implementation choices include:

- reversible character-stat rerolls (“UnRoll”); ([new-game implementation](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/game/newgame.cpp#L102-L121))
- JSON save state compressed with zlib and checked with a non-cryptographic character hash; ([save/load](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/game/game.cpp#L109-L148), [serialization](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/game/jsonserialiser.cpp#L72-L215))
- scrollable dense desktop layouts, smooth progress bars, and list autoscroll only when content changes; ([Qt dashboard](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/qt/qtgamescreen.cpp#L41-L202), [incremental/autoscroll updates](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/qt/qtgamescreen.cpp#L247-L352)) and
- elapsed-time clamping after sleep or a long stall, deliberately refusing offline catch-up. ([timer handling](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/qt/qtgamescreen.cpp#L361-L372))

The repository is not archived, but it has no tagged releases and no code commits after January 11, 2025 UTC. All 83 GitHub-attributed commits are from one contributor. As of this review, that is evidence of a dormant personal project, not an actively released dependency. ([latest commit](https://github.com/nbollom/pq2/commit/62416beb54f48d4d9aa66b55e436287f12491285), [commit history](https://github.com/nbollom/pq2/commits/master/), [releases](https://github.com/nbollom/pq2/releases), [contributors](https://github.com/nbollom/pq2/graphs/contributors))

### License and reuse

The root `LICENSE` is the complete GNU GPL version 3, added immediately after the first source/data commit, and GitHub detects GPL-3.0 for the repository. No source file carries a conflicting license notice. GPLv3 permits copying and modification only while satisfying its notice, corresponding-source, and copyleft conditions when covered work is conveyed. ([repository license](https://github.com/nbollom/pq2/blob/62416beb54f48d4d9aa66b55e436287f12491285/LICENSE), [license-addition commit](https://github.com/nbollom/pq2/commit/bd27d04c314797aeb1d897581cc6174b18c8ccf4), [GPLv3 text](https://www.gnu.org/licenses/gpl-3.0.html))

Practical boundary for this MIT repository:

- **May reuse under GPLv3 only:** Bollom-authored implementation code, if attribution/notices/source are preserved and the resulting covered distribution complies with GPLv3. That is not compatible with keeping the combined application MIT-only, so the present recommendation is **do not copy it**.
- **May use as inspiration:** architecture, UI behavior, and algorithmic ideas, independently implemented from our own specification and legacy oracle without copying expression.
- **Do not import despite the repository license:** the Progress Quest-derived data tables and `resources/pq.png`. They have no separate author/provenance/license statement; a repository license cannot resolve whether the contributor possessed rights to upstream material or embedded art. The first data commit visibly reproduces classic names and tables. ([initial data commit](https://github.com/nbollom/pq2/commit/8ef7811608f83314bf674e3d5a82ed4bc6273cf3), [`pq.png` history](https://github.com/nbollom/pq2/commits/master/resources/pq.png))

Confidence: **high** on architecture, features, repository license, and maintenance history; **medium-high** on asset/data restrictions because provenance is undocumented rather than affirmatively incompatible.

## Ideas compatible with this project's mission

1. **Mechanics-neutral world chronicle (worth a design spike).** Borrow only DragonII's observer-facing idea: derive a calendar, location name, enemy dossier, victory count, and journey history from already-authoritative events. It must consume no RNG, change no task duration/reward, and avoid save-schema changes unless separately approved.
2. **Truthful opponent dossier, not invented combat.** Issue #58 already establishes that classic Progress Quest has no damage/mitigation/spell-damage system. Show canonical monster level, encounter duration, loot prospect, and sardonic narrative—not fake HP or DPS.
3. **Keep the existing deep-module boundary.** Bollom's toolkit-independent core validates our `src/engine/`/`src/components/` split, but offers no missing capability worth importing.
4. **Do not duplicate already-delivered UX.** Reversible rerolls, bounded scrolling/autoscroll, sleep/throttling handling, autosave/resume, portable saves, and multi-surface responsiveness already exist or have tracked issues here.
5. **Reject incompatible sequel mechanics by default.** Manual stat spending, talent bonuses, AI equipment decisions, simulated damage/block, win/loss balance, and a new save format would change the zero-player fidelity contract. They need an explicit post-fidelity product decision, not silent adoption.

## Tracked follow-up

- [#143](https://github.com/williamzujkowski/progress-quest-ii/issues/143) tracks a third-party provenance and license-boundary audit so the root MIT license's scope and inherited classic Progress Quest material become explicit.
- [#144](https://github.com/williamzujkowski/progress-quest-ii/issues/144) tracks a low-priority design spike for a deterministic world chronicle that cannot invent mechanics or compromise replay parity.
