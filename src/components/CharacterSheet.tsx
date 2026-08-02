import { Shield, Sparkles, Sword, User } from 'lucide-react';
import React from 'react';
import { EQUIP_SLOTS } from '../data/traits';
import type { EquipSlot } from '../engine/types';
import { useGameStore } from '../state/gameStore';

export const CharacterSheetView: React.FC = () => {
  const { character } = useGameStore();

  return (
    <section className="card character-card" aria-labelledby="char-sheet-heading" tabIndex={0}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} />
          <h2 id="char-sheet-heading">Character Sheet</h2>
        </div>
        <span className="badge">
          {character.Traits.Race} {character.Traits.Class}
        </span>
      </div>

      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Prime Stats</div>
      <div className="stat-grid" data-testid="character-prime-stats">
        <div className="stat-item">
          <span>STR</span>
          <strong>{character.Stats.STR}</strong>
        </div>
        <div className="stat-item">
          <span>CON</span>
          <strong>{character.Stats.CON}</strong>
        </div>
        <div className="stat-item">
          <span>DEX</span>
          <strong>{character.Stats.DEX}</strong>
        </div>
        <div className="stat-item">
          <span>INT</span>
          <strong>{character.Stats.INT}</strong>
        </div>
        <div className="stat-item">
          <span>WIS</span>
          <strong>{character.Stats.WIS}</strong>
        </div>
        <div className="stat-item">
          <span>CHA</span>
          <strong>{character.Stats.CHA}</strong>
        </div>
      </div>

      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <Shield size={14} /> Equipment Slots
      </div>
      <div className="equip-list" role="region" tabIndex={0} aria-label="Equipment List" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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

      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <Sparkles size={14} /> Spell Book ({character.Spells.length})
      </div>
      <div className="equip-list" role="region" tabIndex={0} aria-label="Spell Book" style={{ maxHeight: '140px', overflowY: 'auto' }}>
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
