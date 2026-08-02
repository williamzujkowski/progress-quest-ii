import { Coins, Package } from 'lucide-react';
import React from 'react';
import { useGameStore } from '../state/gameStore';
import { ItemTooltip } from './ItemTooltip';

export const InventoryView: React.FC = () => {
  const { character } = useGameStore();

  const nonGoldItems = character.Inventory.filter((item) => item.name !== 'Gold');

  return (
    <section className="card inventory-card" aria-labelledby="inventory-heading">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={18} />
          <h2 id="inventory-heading">Inventory & Loot</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--accent-warning)', fontWeight: 'bold' }}>
          <Coins size={16} />
          <span>{character.Gold} GP</span>
        </div>
      </div>

      <div className="equip-list inventory-list" role="region" tabIndex={0} aria-label="Inventory items">
        {nonGoldItems.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
            Inventory is empty. Head into battle to collect loot!
          </div>
        ) : (
          nonGoldItems.map((item, index) => (
            <div className="equip-item" key={index}>
              <ItemTooltip kind="inventory" name={item.name} quantity={item.qty} />
              <span style={{ fontWeight: 600 }}>x{item.qty}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
