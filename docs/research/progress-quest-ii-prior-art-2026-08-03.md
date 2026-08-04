# “Progress Quest II” prior-art check — 2026-08-03

## Verdict

We are **not the first project to use “Progress Quest 2” for a real Progress Quest derivative**. At least two implemented projects predate this repository:

1. A Russian Windows freeware game called **Progress Quest 2 v1.02** was published by DragonII no later than February 3, 2012. Its surviving listing describes character creation, a world map, inventory, spells, equipment, player and enemy statistics, and autosaving to `save.pq2`; the page also preserves the creator discussing its equipment AI and design with players. This is an actual derivative game, not a search-phrase collision, although the original download mirrors are now dead. ([2012 game listing and discussion](https://small-games.info/?go=game&c=10&i=9794), [creator profile](https://small-games.info/?go=user&uid=99029))
2. Nicholas Bollom's public **`nbollom/pq2`** repository has described itself as a cross-platform Progress Quest remake since its initial commit on June 1, 2016. More decisively, that initial source names the program **“Progress Quest 2 - The Progression”**; the maintained repository reports complete game, Qt, and ncurses implementations. ([initial commit](https://github.com/nbollom/pq2/commit/8ef7811608f83314bf674e3d5a82ed4bc6273cf3), [initial title in source](https://github.com/nbollom/pq2/blob/8ef7811608f83314bf674e3d5a82ed4bc6273cf3/main.cpp#L15), [current repository](https://github.com/nbollom/pq2))

**Recommendation:** rename this project to **Progress Quest III: The Search for Progress Quest II**. It is accurate enough for comedy, openly acknowledges that the numeral was already occupied, and turns an awkward collision into the premise. Use `progress-quest-iii` for the repository/Pages slug while retaining an explicit “unofficial continuation” disclaimer.

## What does not count as a prior sequel

- Eric Fredricksen's official April 2002 release candidate was called **Progress Quest OEM Service Release 2 (OSR2)** and informally **Progress Quest Realms**, not Progress Quest II. A contemporaneous AnandTech commenter called it a “progress quest 2 release candidate,” but the official first-party naming and download history treat it as an expansion/version of Progress Quest; official Windows releases are numbered 6.0 through 6.4.4. ([official developer diary](https://progressquest.com/diary.php), [official downloads](https://progressquest.com/dl.php), [contemporaneous comment](https://forums.anandtech.com/threads/lol-progress-quest.768422/#post-4144659))
- A July 2002 Dungeon Master forum joke proposed calling an automated combat tool “Progress Quest II,” but no such titled project was announced or shipped there. ([forum post](https://www.dungeon-master.com/forum/viewtopic.php?t=22508))
- **RPG Quest 2 Revisited** is a shipped zero-player mobile RPG that says it is loosely based on Progress Quest. It is useful lineage evidence, but its actual title is *RPG Quest 2*, not *Progress Quest 2*. ([Google Play listing](https://play.google.com/store/apps/details?id=com.redironlabs.rpgquestreloaded&hl=en))

## Search coverage and confidence

- GitHub repository and exact-code searches for `Progress Quest 2`, `Progress Quest II`, `ProgressQuest 2`, and compact/slug variants found the Bollom project plus this repository; broad web searches found the 2012 Russian game.
- Searches of the official Progress Quest site, its news/release archive, Hacker News via the Algolia archive, itch.io, Steam, Google Play, Game Jolt, npm, and crates.io found no additional exact-title implementation. Hacker News contains many references to the original but no exact-title sequel hit in the focused `progressquest`/quoted-phrase result sets.
- Confidence is **high** that “Progress Quest 2” has substantive prior use and that keeping “Progress Quest II” would not make us the first. Confidence is **medium** that the two projects above are the only implemented predecessors: old freeware, forums, and dead download hosts are incompletely indexed.
- This is a historical/product-naming search, not a trademark clearance or legal opinion.

## Five suitably unnecessary names

1. **Progress Quest III: The Search for Progress Quest II** — recommended; the missing-middle joke explains the rename by itself.
2. **Progress Quest 2²: Enterprise Progression Platform** — mathematically skips to four and earns a promotion for it.
3. **Progress Quest III.0: Now With 0% More Player** — direct, pompous, and product-management compliant.
4. **Progress Quest: The Next Unnecessary Generation** — avoids numeric ownership while retaining sequel grandeur.
5. **Progress Quest ∞: The Final Version, Again** — excellent title, mildly inconvenient URL; use `progress-quest-infinity` as the slug.
