import { Award } from 'lucide-react';
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../state/gameStore';
import { isEmpty } from '../state/commendations';
import { GameNumber } from './GameNumber';
import { ItemTooltip } from './ItemTooltip';

/**
 * The institution's filing cabinet about itself: maxima and counts over events that already
 * happened. Every figure is a fact the engine reported — nothing here is a reward, an unlock,
 * or a claim about a mechanic that does not exist.
 *
 * Absent entirely until there is something to file, because a row of zeroes reads as a broken
 * panel rather than a young one.
 */
export const Commendations: React.FC = () => {
  const records = useGameStore(useShallow((state) => state.commendations));
  if (isEmpty(records)) return null;

  const rows: ReadonlyArray<readonly [string, number]> = [
    ['Highest level attained', records.highestLevel],
    ['Largest single sale', records.largestSale],
    ['Quests closed', records.questsCompleted],
    ['Acts concluded', records.actsCompleted],
  ];

  // partialRecord means every value is optional to the type system; filter rather than assert.
  const exhibit = Object.entries(records.exhibit).flatMap(([slot, entry]) => (entry ? [[slot, entry] as const] : []));

  return (
    <>
      <div className="section-label">
        <Award size={14} aria-hidden="true" /> Commendations
      </div>
      <div className="equip-list commendation-list" role="region" aria-label="Commendation ledger">
        {rows.map(([label, value]) => (
          <div className="equip-item" key={label}>
            <span className="equip-slot">{label}</span>
            <span className="commendation-value"><GameNumber value={value} /></span>
          </div>
        ))}
      </div>

      {exhibit.length > 0 && (
        <>
          <div className="section-label">
            <Award size={14} aria-hidden="true" /> Exhibit Case
          </div>
          {/* Prestige, not power: worldContext's own classification, which records explicitly
              that equipment has no combat contribution. */}
          <div className="equip-list commendation-list" role="region" aria-label="Exhibit case">
            {exhibit.map(([slot, entry]) => (
              <div className="equip-item" key={slot}>
                <span className="equip-slot">{slot}</span>
                <ItemTooltip kind="equipment" name={entry.name} slot={slot as never} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};
