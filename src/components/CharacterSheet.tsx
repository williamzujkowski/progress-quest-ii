import { Shield, Sparkles, Sword } from 'lucide-react';
import React from 'react';
import { EQUIP_SLOTS } from '../data/traits';
import type { EquipSlot } from '../engine/types';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../state/gameStore';
import { GameNumber } from './GameNumber';
import { ItemTooltip } from './ItemTooltip';
import { Commendations } from './Commendations';
import { Caseload } from './Caseload';

export const CharacterSheetView: React.FC = () => {
  // Equip and Spells changed identity 3 times across a measured 400 ticks; the character
  // reference changed 400 times, because Task advances every tick.
  const { Equip, Spells } = useGameStore(useShallow((state) => ({
    Equip: state.character.Equip,
    Spells: state.character.Spells,
  })));
  const character = { Equip, Spells };

  return (
    <section className="card character-card" aria-labelledby="loadout-heading" tabIndex={0}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={18} />
          <h2 id="loadout-heading">Character Loadout</h2>
        </div>
      </div>

      <div className="section-label">
        <Shield size={14} /> Equipment Slots
      </div>
      <div className="equip-list equipment-list" role="region" tabIndex={0} aria-label="Equipment List">
        {EQUIP_SLOTS.map((slot: EquipSlot) => {
          const equipName = character.Equip[slot] || '—';
          return (
            <div className="equip-item" key={slot}>
              <span className="equip-slot" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {slot === 'Weapon' ? <Sword size={12} /> : <Shield size={12} />}
                {slot}
              </span>
              <ItemTooltip kind="equipment" name={equipName} slot={slot} />
            </div>
          );
        })}
      </div>

      <div className="section-label">
        <Sparkles size={14} /> Spell Book ({character.Spells.length})
      </div>
      <div className="equip-list spell-list" role="region" tabIndex={0} aria-label="Spell Book">
        {character.Spells.length === 0 ? (
          <div className="empty-state">
            No spells have been learned. They arrive automatically at level-up and may also be awarded for completed quests; the curriculum remains aggressively theoretical.
          </div>
        ) : (
          character.Spells.map((spell) => (
            <div className="equip-item" key={spell.name}>
              <ItemTooltip kind="spell" name={spell.name} level={spell.level} />
              <span className="badge">Lvl{' '}<GameNumber value={spell.level} /></span>
            </div>
          ))
        )}
      </div>

      <Commendations />
      <Caseload />
    </section>
  );
};
