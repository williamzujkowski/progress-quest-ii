import { Package, Weight } from 'lucide-react';
import React from 'react';
import { calculateEncumbranceMax } from '../engine/math';
import { calculateEncumbrance } from '../engine/sim';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../state/gameStore';
import { GameNumber } from './GameNumber';
import { ItemTooltip } from './ItemTooltip';

export const InventoryView: React.FC = () => {
  // Inventory changed identity 0 times across a measured 400 ticks, Stats 3 times.
  const { Inventory, Stats } = useGameStore(useShallow((state) => ({
    Inventory: state.character.Inventory,
    Stats: state.character.Stats,
  })));
  const character = { Inventory, Stats };

  const nonGoldItems = character.Inventory.filter((item) => item.name !== 'Gold');
  // Carried weight belongs on the bag, the way EverQuest and WoW put it there. Gold is
  // reported once, on the hero banner, and carries no weight anyway.
  const encumbrance = calculateEncumbrance(character.Inventory);
  const encumbranceMax = calculateEncumbranceMax(character.Stats.STR);
  const atCapacity = encumbrance >= encumbranceMax;
  const encumbrancePct = encumbranceMax > 0
    ? Math.min(100, Math.floor((encumbrance / encumbranceMax) * 100))
    : 0;

  return (
    <section className="card inventory-card" aria-labelledby="inventory-heading">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={18} />
          <h2 id="inventory-heading">Inventory & Loot</h2>
        </div>
        <div className={`inventory-weight${atCapacity ? ' inventory-weight-full' : ''}`}>
          <Weight size={16} aria-hidden="true" />
          <span>
            <GameNumber value={encumbrance} /> / <GameNumber value={encumbranceMax} />
            <span className="sr-only">
              {' '}cubits carried of capacity{atCapacity ? ', at capacity' : ''}
            </span>
          </span>
        </div>
      </div>

      {/* Legacy renders this as a bar labelled "$position/$max cubits" (main.js:955); the
          numeric ratio stays in the header where the eye already looks for it. */}
      <div className={`progress-container progress-encumbrance${atCapacity ? ' progress-encumbrance-full' : ''}`}>
        <div
          className="progress-bar-track"
          role="progressbar"
          aria-label="Encumbrance, in cubits carried of capacity"
          aria-valuenow={encumbrance}
          aria-valuemin={0}
          aria-valuemax={encumbranceMax}
          aria-valuetext={`${encumbrance} of ${encumbranceMax} cubits`}
        >
          <div className="progress-bar-fill" style={{ width: `${encumbrancePct}%` }} />
        </div>
      </div>

      {/*
        A list, not a region. `ClosedCasework` already reasons this out: naming a collection a region
        trades the list role away, and the list role is what tells a reader how many things are here
        and where they are in them. Without it there is no count on entry, no "3 of 80" while
        arrowing, and no list-jump navigation.
      */}
      <ul className="equip-list inventory-list" tabIndex={0} aria-label="Inventory items">
        {nonGoldItems.length === 0 ? (
          <li className="equip-empty" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
            No loot has been retained. Combat supplies it automatically; procurement awaits a monster with transferable assets.
          </li>
        ) : (
          nonGoldItems.map((item, index) => (
            <li className="equip-item" key={index}>
              <ItemTooltip kind="inventory" name={item.name} quantity={item.qty} />
              <span style={{ fontWeight: 600 }}>x<GameNumber value={item.qty} /></span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
};
