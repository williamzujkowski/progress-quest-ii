import { Archive } from 'lucide-react';
import React from 'react';
import { useGameStore } from '../state/gameStore';

/**
 * The quests already closed, in the order an archive would hand them back: most recent first.
 *
 * The engine has kept this list all along — it is persisted with the character and trimmed to a
 * hundred entries at the point a new quest is filed — and until now nothing displayed it. This
 * only reads it. No entry is summarised, ranked, or interpreted; the descriptions are the ones
 * the engine wrote, verbatim, because the joke is that the record is kept scrupulously and means
 * nothing.
 *
 * Absent entirely until the first quest closes, on the same reasoning as the commendation ledger:
 * an empty archive reads as a broken panel rather than a new one.
 */
export const ClosedCasework: React.FC = () => {
  // Selected on its own rather than through the character, so this re-renders when the archive
  // changes and not when the hero takes a step. The array is replaced only when a quest closes.
  const history = useGameStore((state) => state.character.Quest.history);
  if (!history || history.length === 0) return null;

  return (
    <>
      <div className="section-label">
        <Archive size={14} aria-hidden="true" /> Closed Casework
      </div>
      {/*
        Stored oldest-first and shown newest-first, which is the order an archive is actually read.
        Deliberately unnumbered: the engine trims the front of this list once it passes a hundred,
        so any ordinal would quietly stop meaning "the Nth quest" and start meaning "the Nth
        surviving record" — a distinction no reader would make and this panel cannot defend. The
        sequence carries the recency on its own.

        Bounded by that same engine-side trim, so there is nothing to slice here.
      */}
      {/*
        Focusable because it scrolls. A scrollable box with nothing tabbable inside cannot be
        reached by keyboard at all in some browsers, which axe reports as a serious violation and
        which caught this panel on its first run.

        tabIndex alone, without the role="region" the sibling panels carry. Those are divs with no
        implicit role to lose; this is an ordered list, and naming it a region would trade the
        announcement that actually helps here — "list, forty items" — for one that says less.
      */}
      <ol className="casework-list" tabIndex={0} aria-label="Closed casework, most recent first">
        {history.toReversed().map((description, index) => (
          <li className="casework-entry" key={`${history.length - index}-${description}`}>
            {description}
          </li>
        ))}
      </ol>
    </>
  );
};
