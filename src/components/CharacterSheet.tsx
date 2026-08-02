import React from 'react';
import { EQUIP_SLOTS } from '../data/traits';
import { calculateEncumbranceMax } from '../engine/math';
import { calculateEncumbrance } from '../engine/sim';
import type { EquipSlot } from '../engine/types';
import { useGameStore } from '../state/gameStore';

export const CharacterSheetView: React.FC = () => {
  const { character } = useGameStore();

  const encum = calculateEncumbrance(character.Inventory);
  const maxEncum = calculateEncumbranceMax(character.Stats.STR);

  return (
    <div className="card">
      <div className="card-header">
        <span>Character Sheet</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {character.Traits.Race} {character.Traits.Class}
        </span>
      </div>

      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Stats</div>
      <div className="stat-grid">
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
        <div className="stat-item">
          <span>HP</span>
          <strong>{character.Stats['HP Max']}</strong>
        </div>
        <div className="stat-item">
          <span>MP</span>
          <strong>{character.Stats['MP Max']}</strong>
        </div>
      </div>

      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        Encumbrance ({encum} / {maxEncum})
      </div>

      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        Equipment
      </div>
      <div className="equip-list">
        {EQUIP_SLOTS.map((slot: EquipSlot) => (
          <div className="equip-item" key={slot}>
            <span className="equip-slot">{slot}</span>
            <span>{character.Equip[slot] || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
