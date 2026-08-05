import { Coins, Heart, Sparkles } from 'lucide-react';
import React from 'react';
import { PRIME_STATS } from '../data/traits';
import { useGameStore } from '../state/gameStore';
import { ActLabel, GameNumber } from './GameNumber';
import { ItemTooltip } from './ItemTooltip';


export const HeroBanner: React.FC = () => {
  const { character, progression } = useGameStore();

  // Saturates at Number.MAX_VALUE for absurd levels, so guard the denominator.
  const experiencePct = progression.experience.maxSeconds > 0
    ? Math.min(100, Math.floor((progression.experience.currentSeconds / progression.experience.maxSeconds) * 100))
    : 0;

  return (
    <div className="hero-banner" role="region" aria-label="Hero Overview Banner">
      <div className="hero-identity">
        <div className="hero-name">
          <span>{character.Traits.Name}</span>
          <span className="badge" title="Character Level">Lvl{' '}<GameNumber value={character.Traits.Level} /></span>
        </div>
        <div
          className="hero-experience"
          role="progressbar"
          aria-label="Experience toward next level"
          aria-valuenow={experiencePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${experiencePct}% toward the next level`}
        >
          <div className="progress-bar-fill" style={{ width: `${experiencePct}%` }} />
        </div>
        <div className="hero-sub">
          {character.Traits.Race} {character.Traits.Class} • <ActLabel act={character.Plot.act} />
        </div>
      </div>

      <div className="hero-meters">
        <div className="meter-group">
          <div className="meter-header">
            <span className="inline-icon meter-health">
              <Heart size={12} /> HP Max
            </span>
            <strong><GameNumber value={character.Stats['HP Max']} /></strong>
          </div>
        </div>

        <div className="meter-group">
          <div className="meter-header">
            <span className="inline-icon meter-magic">
              <Sparkles size={12} /> MP Max
            </span>
            <strong><GameNumber value={character.Stats['MP Max']} /></strong>
          </div>
        </div>
      </div>

      <div className="hero-prime-stats" data-testid="hero-prime-stats" aria-label="Prime stats">
        {PRIME_STATS.map((stat) => (
          <div className="hero-stat" key={stat}>
            <span>{stat}</span>
            <strong><GameNumber value={character.Stats[stat]} /></strong>
          </div>
        ))}
      </div>

      <div className="hero-stats-quick">
        {/* Gold reads once, here. Carried weight lives on the inventory panel, where the
            bag it describes is. The tooltip is what teaches that Gold weighs nothing. */}
        <div className="stat-pill gold-pill">
          <Coins size={16} aria-hidden="true" />
          <ItemTooltip kind="inventory" name="Gold" quantity={character.Gold}>
            <GameNumber value={character.Gold} />{' '}GP
          </ItemTooltip>
        </div>
      </div>
    </div>
  );
};
