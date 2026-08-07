**Superseded by ADR 0005.** The numeral and its reasoning survive; the subtitle does not. See
`0005-name-the-project-the-search-for-more-compute.md` for why the Spaceballs structure's two
halves were separated. The repository and Pages move shipped in #306; the redirects-first
precondition from #140 was waived by the owner for that move.

# Rename to Progress Quest III: The Search for Progress Quest II

Adopt **Progress Quest III: The Search for Progress Quest II** as the project title, with
the short form **Progress Quest III** for the masthead, browser tab, and anywhere the full
title does not fit, and the slug `progress-quest-iii` now used by the repository and
Pages move. This decision records the name only. No code, storage key, `.pqw` terminology,
repository name, or deployed URL changes as part of it; #140 tracked the implementation and
the repository and Pages move shipped in #306.

The current name collides with prior art, which #140 documents: DragonII published a Russian
Windows game titled *Progress Quest 2 v1.02* by February 2012, and `nbollom/pq2` has called
itself *Progress Quest 2 - The Progression* in source since June 2016. Vacating the contested
numeral resolves the collision outright rather than litigating it, and skipping to III makes
the absent middle installment the joke — the Spaceballs construction, applied to a project
whose masthead already reads "Zero players. Zero developers. Progress continues regardless."
A parody of MMO progression should not be named like the live-service releases it parodies,
which is why *Progress Quest Infinity* and *Progress Quest Legends* were rejected despite both
being free of prior art: they are safe but comedically inert, and both sit in heavily used
suffix space where a future collision is likelier than with a deliberately absurd title.
Keeping *Progress Quest II* was rejected because it knowingly re-ships a defect the project
has already identified.

The previous rebrand shipped on an incomplete prior-art check, so this one records its scope
rather than asserting a bare result. As of 2026-08-04, no game named "Progress Quest III" or
"Progress Quest 3" was found by web search; no GitHub repository holds `progress-quest-iii`,
`progress-quest-infinity`, or `progress-quest-legends`; the npm names `progress-quest-iii`,
`progress-quest-3`, and `progressquest3` all return 404; and no listing was found on itch.io,
Steam, or Google Play. **Not checked: trademark registries and domain availability.** Anyone
implementing the rename should close those two before moving the repository, because a search
that stops where the searcher ran out of patience is the exact failure this ADR exists to
avoid. Note also that III positions two unaffiliated third-party derivatives as implicit
lineage; they are unrelated projects and the subtitle should be read as acknowledgement, not
continuity.

A seven-role Nexus consensus panel approved this unanimously (7/0/0, simple majority) on
2026-08-04, with several voters independently re-verifying the prior-art claim rather than
trusting the proposal. The contrarian voter approved at the lowest confidence (0.72) on the
condition that the verification scope be stated — the paragraph above is that condition being
met. The panel also flagged two implementation constraints worth carrying into #140: the old
slug becomes claimable by third parties once a repository rename lands, so redirects need an
owner and a mechanism before the move, and the save-compatibility invariants should be pinned
by tests *before* any rename so a later PR cannot silently break them.
