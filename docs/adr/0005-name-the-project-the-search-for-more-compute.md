# Rename to Progress Quest III: The Search for More Compute

Adopt **Progress Quest III: The Search for More Compute** as the project title, with the short
form **Progress Quest III** for the masthead, browser tab, and anywhere the full title does not
fit, and the slug `progress-quest-iii` reserved for a future repository and Pages move.

This supersedes ADR 0002, which chose *Progress Quest III: The Search for Progress Quest II*, and
resolves ADR 0004, which reopened the question and deliberately decided nothing. The numeral is
unchanged and so is its reasoning: III vacates a contested numeral rather than litigating it,
since DragonII shipped a *Progress Quest 2* in 2012 and `nbollom/pq2` has called itself *Progress
Quest 2 - The Progression* since 2016.

What changed is the subtitle, and why is worth recording, because 0002's subtitle was good.

## The Spaceballs structure has two parts, and only one was being used

*Spaceballs II: The Search for More Money* is funny twice: a sequel that references an
installment that does not exist, and a subtitle that admits the cynical motive for making it.
0002 used the first and spent the second on the missing installment as well, so both halves told
the same joke.

Separating them lets each carry its own. The numeral still does the missing-sequel work. The
subtitle now admits the motive — this version exists because machines had somewhere to put their
cycles — which is the thing that is actually true of it. It was built by AI, it runs unattended,
and a lightweight in-browser model for the chatter is under investigation. *More Money* to *More
Compute* also keeps the original's rhythm, so the reference lands without being explained.

The joke is warmer than it looks. The register this project has settled into is a cheerful
institution being relentlessly diligent about something pointless, and a title about wanting more
compute is that same voice: not menacing, just quietly certain that the work will continue and
that nobody needs to be present for it.

## What was considered and set aside

*Abandoned in Place* was the funniest name found and is a better title for a game about absence
than about succession. It says the humans left; this project's joke is that something took over
and is doing a cheerful job of it forever.

*Headless*, *Daemon*, *Cron* and *Idle* were rejected on a structural argument rather than taste.
Progress Quest's own title gives no genre marker — "Quest" reads as a conventional RPG, and the
joke is that a genre-typical name conceals a game with no player. Naming the mechanism converts
the title into an announcement and explains the joke in the name.

*Unwitnessed* was recommended and withdrawn: accurate, available, and not funny. It is
melancholy, which is the opposite of a masthead reading "Progress continues regardless".

*Nobody* collides with *Nobody Saves the World*. *Infinity* is heavily occupied — Infinity Blade,
Disney Infinity, BioWare's Infinity Engine. *Daemon* collides with *Daemon X Machina*.

## Prior art checked, and what was not

For *The Search for More Compute*: npm returns 404 for every slug form tried, GitHub has no
repository of that name, and a full-text search surfaces only repositories that mention the phrase.
Steam and itch.io searches for the title returned descriptive prose containing the words, not a
game by that name.

The US federal trademark register was searched, and found nothing in the way:

| Phrase | Records | Nearest mark |
| --- | --- | --- |
| `"search for more compute"` | 0 | — |
| `"more compute"` | 376 | MORE COMPUTERS, IC 042, cancelled under Section 8 (75041387) |
| `"progress quest"` | 7 | none is *Progress Quest*; all dead, all fuzzy matches such as PROCUREQUEST |

Every hit for `"more compute"` matched the phrase in goods-and-services prose rather than in a
mark. No live registration uses either phrase as a wordmark.

Worth recording for anyone repeating this: the public search page ORs the terms in a quoted
phrase, so `"more compute"` returns twenty thousand records containing *compute*, and the
field-tag mode reverts on every submit. The numbers above come from the endpoint the page itself
calls, `POST tmsearch.uspto.gov/prod-v1-0-0/tmsearch`, which honours a quoted phrase. A search run
through the front end would have produced a count that looked like an answer and was not one.

Still unchecked: state registrations, unregistered common-law use, non-US registries, and older or
defunct freeware directories.

## Still open

- ~~**The tagline.**~~ Resolved, by discovering the question was wrong. This ADR assumed the
  missing-sequel joke needed rehoming once the subtitle stopped telling it. There is no missing
  sequel: two *Progress Quest 2*s already exist, which is recorded three paragraphs above this one
  and was contradicted anyway. A tagline built on it would have asserted something false, which the
  editorial contract forbids and which is a worse failure than an unfunny tagline.

  So the master tagline is unchanged — "Zero players. Zero developers. Progress continues
  regardless." is true, is the thing the project actually is, and does not compete with the
  subtitle. The browser title takes the full name, because a tab is what lands in bookmarks and
  history and spending it on a joke leaves the title displayed nowhere. The numeral joke, in its
  truthful form — the second installment is oversubscribed, not absent — went to the README, where
  prose can carry it.
- **The repository and Pages move.** Unchanged from #140: redirects planned before the URL moves,
  and #111 already tracks the older `/progquest/` path.

## What does not change

Save compatibility, storage keys, and `.pqw` terminology are untouched. A rename that costs
somebody their Hob-Hobbit is worse than any name. Visible identity, manifest, metadata, README,
tests, and deployment validation change atomically or not at all.
