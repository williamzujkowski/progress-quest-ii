# World chronicle prototype — issue #144

Status: the prototype code is gone; this is the record of what it decided.

The experiment lived on `prototype/144-world-chronicle`, was never merged, and was correctly
marked "do not merge as production code". Its evaluation, though, was the point of building it,
and that evaluation existed only on the branch — so deleting the branch would have deleted the
reasoning behind a layout decision the application still follows. It is retained here for that
reason and for no other.

**What became of it.** The gazette direction was adopted: the world console reuses the activity
region rather than claiming a fourth horizontal surface, and detail is reached through bounded,
focusable disclosures instead of always-open panels. The records surfaces added later follow the
same rule. The rail and marginalia variants were not built.

## Truth contract

The experiment reads the existing character, act, quest, task, progression, activity IDs, and bounded quest history. It does not call the RNG, change the engine, add a timer, persist observer data, or alter checkpoint bytes.

- Venue is a conservative classification of the typed task state: killing fields, market, road, prologue transit, or narrative transit.
- The clock is labeled adventure elapsed time. It is not an invented date, day, season, or wall clock.
- The dossier exposes only the task caption, scheduled duration, and fixed/random loot prospect. Unsupported HP and DPS are explicitly “Not modeled.”
- Guild of Zero appears only after Act 0 and says it is fictional texture with no real players.
- One callback appears only when the exact current quest occurs more than once in the existing bounded quest history. Its filing class uses the stable runtime activity ID and has no gameplay effect.
- The gazette ledger displays the existing Activity record unchanged; it does not parse prose into new facts.

## Evaluation

Automated checks used Chromium, dark theme, reduced motion, and WCAG 2.1 A/AA axe rules.

| Variant | 1440×900 | 1025×760 | Mobile | Verdict |
| --- | --- | --- | --- | --- |
| Rail | Closed state fits one screen; 62px tall. | Closed state fits; opening earned detail grows the page to 828px and leaves only 177px for the core grid. | No horizontal overflow, but the closed rail grows to 147px and repeats the task line. | **Cut.** Clear orientation does not justify a fourth horizontal surface. |
| Gazette | Reuses Activity space; page remains 900px tall. | Open detail remains within the 760px page and the core grid retains 434px. | No horizontal overflow; detail and ledger are bounded, focusable scrollers. | **Keep as direction.** It creates the strongest hierarchy without displacing another card. |
| Marginalia | Only 28px tall. | Only 28px tall. | 92px at 320px with no overflow. | **Cut as a system.** Cheap but fragmented; individual terse labels may be reused. |

Across the closed-state matrix (three variants × five viewports: 1440×900, 1025×760, 768×900, 375×900, 320×900):

- 0 horizontal page-overflow failures
- 0 WCAG A/AA axe findings
- 44px minimum switcher target height
- 100dvh desktop page height at both desktop thresholds

The earned-state dossier/guild/callback fixture also produced zero axe findings after making its bounded detail region keyboard-focusable. The rail's open state failed the one-screen hard gate; deletion is the result, not a CSS workaround.

## Production recommendation

Carry a smaller gazette masthead into the planned Chatter/Activity world console (#159), after the simulated chat contract (#153):

1. Keep one terse `LOOK`-style location plus Act and adventure elapsed time.
2. Keep the existing Activity ledger and stable event identities; do not create a second history.
3. Put known assignment facts in one native disclosure and label unsupported mechanics “Not modeled.”
4. Keep the plainly fictional one-line Guild of Zero joke after an earned canonical milestone.
5. Defer the administrative callback until the world console retains typed transition events; a quest-history-only callback is too narrow to justify production code.

This should be implemented from a fresh production branch. The prototype components and CSS are intentionally disposable.
