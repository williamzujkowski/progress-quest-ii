import { Shield, Sparkles, Sword } from 'lucide-react';
import React from 'react';
import { EQUIP_SLOTS } from '../data/traits';
import type { EquipSlot } from '../engine/types';
import { useGameStore } from '../state/gameStore';

export const CharacterSheetView: React.FC = () => {
  const { character } = useGameStore();

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
      <div className="equip-list loadout-list" role="region" tabIndex={0} aria-label="Equipment List">
        {EQUIP_SLOTS.map((slot: EquipSlot) => {
          const equipName = character.Equip[slot] || '—';
          return (
            <div className="equip-item" key={slot}>
              <span className="equip-slot" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {slot === 'Weapon' ? <Sword size={12} /> : <Shield size={12} />}
                {slot}
              </span>
              <span>{equipName}</span>
            </div>
          );
        })}
      </div>

      <div className="section-label">
        <Sparkles size={14} /> Spell Book ({character.Spells.length})
      </div>
      <div className="equip-list loadout-list" role="region" tabIndex={0} aria-label="Spell Book">
        {character.Spells.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No spells learned yet. Complete quests to learn spells!
          </div>
        ) : (
          character.Spells.map((spell) => (
            <div className="equip-item" key={spell.name}>
              <span>{spell.name}</span>
              <span className="badge" style={{ fontSize: '0.75rem' }}>Lvl {spell.level}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
