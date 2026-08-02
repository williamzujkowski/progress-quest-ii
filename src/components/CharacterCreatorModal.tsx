import { Dices, Sparkles, UserPlus, X } from 'lucide-react';
import React, { useState } from 'react';
import { KLASSES, PRIME_STATS, RACES } from '../data/traits';
import { generateInitialStats } from '../engine/math';
import { RandomGenerator } from '../engine/prng';
import { generateRandomName } from '../engine/sim';
import type { StatsMap } from '../engine/types';
import { useGameStore } from '../state/gameStore';

interface CharacterCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CharacterCreatorModal: React.FC<CharacterCreatorModalProps> = ({ isOpen, onClose }) => {
  const { startSession } = useGameStore();

  const [name, setName] = useState(generateRandomName());
  const [race, setRace] = useState(RACES[0].name);
  const [klass, setKlass] = useState(KLASSES[0].name);

  // Stat Rolling state
  const [seedHistory, setSeedHistory] = useState<number[]>([]);
  const [currentSeed, setCurrentSeed] = useState<number>(Date.now());
  const [stats, setStats] = useState<StatsMap>(() => generateInitialStats(new RandomGenerator(currentSeed), race, klass));

  if (!isOpen) return null;

  const totalStats = PRIME_STATS.reduce((sum, stat) => sum + (stats[stat] || 0), 0);

  const getTotalTone = (total: number) => {
    if (total >= 81) return 'badge-danger';
    if (total > 72) return 'badge-warning';
    if (total < 54) return 'badge-muted';
    return '';
  };

  const handleRoll = () => {
    const nextSeed = Date.now() + Math.floor(Math.random() * 10000);
    setSeedHistory((prev) => [...prev, currentSeed]);
    setCurrentSeed(nextSeed);
    setStats(generateInitialStats(new RandomGenerator(nextSeed), race, klass));
  };

  const handleUnroll = () => {
    if (seedHistory.length === 0) return;
    const prevSeed = seedHistory[seedHistory.length - 1];
    setSeedHistory((prev) => prev.slice(0, -1));
    setCurrentSeed(prevSeed);
    setStats(generateInitialStats(new RandomGenerator(prevSeed), race, klass));
  };

  const handleRandomName = () => {
    setName(generateRandomName());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    startSession({ source: 'creation', name: name.trim(), race, klass, seed: currentSeed, stats });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="creator-title">
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="creator-title">
            Progress Quest - New Character
          </h2>
          <button className="btn btn-compact" onClick={onClose} aria-label="Close character creator modal">
            <X size={16} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Name & Random Name Generator */}
          <div>
            <label className="field-label" htmlFor="character-name">
              Character Name
            </label>
            <div className="field-row">
              <input
                id="character-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-control"
              />
              <button type="button" className="btn" onClick={handleRandomName} title="Generate Random Name">
                <Sparkles size={16} /> Random
              </button>
            </div>
          </div>

          {/* Stat Roller with Total Sum Display */}
          <div className="surface-panel">
            <div className="surface-header">
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Prime Stats (3d6 Rolls)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Total:</span>
                <span className={`badge total-badge ${getTotalTone(totalStats)}`}>
                  {totalStats}
                </span>
              </div>
            </div>

            <div className="stat-grid" data-testid="creator-prime-stats" style={{ marginBottom: '0.75rem' }}>
              {PRIME_STATS.map((stat) => (
                <div className="stat-item" key={stat}>
                  <span>{stat}</span>
                  <strong>{stats[stat]}</strong>
                </div>
              ))}
            </div>

            <div className="button-row">
              <button type="button" className="btn btn-primary" onClick={handleRoll} style={{ flex: 1, justifyContent: 'center' }}>
                <Dices size={16} /> Roll 'Em
              </button>
              <button type="button" className="btn" onClick={handleUnroll} disabled={seedHistory.length === 0} style={{ flex: 1, justifyContent: 'center' }}>
                Unroll (Undo)
              </button>
            </div>
          </div>

          {/* Race & Class Pickers */}
          <div className="picker-grid">
            <div>
              <div className="field-label">
                Select Race
              </div>
              <div className="picker-list surface-panel">
                {RACES.map((r) => (
                  <label className="picker-option" key={r.name}>
                    <input
                      type="radio"
                      name="racePicker"
                      value={r.name}
                      checked={race === r.name}
                      onChange={() => {
                        setRace(r.name);
                        setStats(generateInitialStats(new RandomGenerator(currentSeed), r.name, klass));
                      }}
                    />
                    <span>{r.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="field-label">
                Select Class
              </div>
              <div className="picker-list surface-panel">
                {KLASSES.map((k) => (
                  <label className="picker-option" key={k.name}>
                    <input
                      type="radio"
                      name="klassPicker"
                      value={k.name}
                      checked={klass === k.name}
                      onChange={() => {
                        setKlass(k.name);
                        setStats(generateInitialStats(new RandomGenerator(currentSeed), race, k.name));
                      }}
                    />
                    <span>{k.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            <UserPlus size={16} /> Sold! Start Questing
          </button>
        </form>
      </div>
    </div>
  );
};
