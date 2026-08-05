import { Award } from 'lucide-react';
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../state/gameStore';
import { isEmpty } from '../state/commendations';
import { GameNumber } from './GameNumber';

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
    </>
  );
};
