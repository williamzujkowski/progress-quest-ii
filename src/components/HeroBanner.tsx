import { Coins, Heart, Package, Sparkles } from 'lucide-react';
import React from 'react';
import { calculateEncumbranceMax } from '../engine/math';
import { calculateEncumbrance } from '../engine/sim';
import { useGameStore } from '../state/gameStore';
import { describeAct } from '../state/gameEventAdapter';

const PRIME_STATS = ['STR', 'CON', 'DEX', 'INT', 'WIS', 'CHA'] as const;

export const HeroBanner: React.FC = () => {
  const { character } = useGameStore();

  const encum = calculateEncumbrance(character.Inventory);
  const maxEncum = calculateEncumbranceMax(character.Stats.STR);

  return (
    <div className="hero-banner" role="region" aria-label="Hero Overview Banner">
      <div className="hero-identity">
        <div className="hero-name">
          <span>{character.Traits.Name}</span>
          <span className="badge" title="Character Level">Lvl {character.Traits.Level}</span>
        </div>
        <div className="hero-sub">
          {character.Traits.Race} {character.Traits.Class} • {describeAct(character.Plot.act)}
        </div>
      </div>

      <div className="hero-meters">
        <div className="meter-group">
          <div className="meter-header">
            <span className="inline-icon meter-health">
              <Heart size={12} /> HP Max
            </span>
            <strong>{character.Stats['HP Max']}</strong>
          </div>
        </div>

        <div className="meter-group">
          <div className="meter-header">
            <span className="inline-icon meter-magic">
              <Sparkles size={12} /> MP Max
            </span>
            <strong>{character.Stats['MP Max']}</strong>
          </div>
        </div>
      </div>

      <div className="hero-prime-stats" data-testid="hero-prime-stats" aria-label="Prime stats">
        {PRIME_STATS.map((stat) => (
          <div className="hero-stat" key={stat}>
            <span>{stat}</span>
            <strong>{character.Stats[stat]}</strong>
          </div>
        ))}
      </div>

      <div className="hero-stats-quick">
        <div className="stat-pill gold-pill" title="Gold GP Balance">
          <Coins size={16} />
          <span>{character.Gold} GP</span>
        </div>

        <div className="stat-pill" title="Inventory Encumbrance Capacity">
          <Package size={16} />
          <span>{encum} / {maxEncum}</span>
        </div>
      </div>
    </div>
  );
};
