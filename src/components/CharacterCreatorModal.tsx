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
  const { resetGame } = useGameStore();

  const [name, setName] = useState(generateRandomName());
  const [race, setRace] = useState(RACES[0].name);
  const [klass, setKlass] = useState(KLASSES[0].name);

  // Stat Rolling state
  const [seedHistory, setSeedHistory] = useState<number[]>([]);
  const [currentSeed, setCurrentSeed] = useState<number>(Date.now());
  const [stats, setStats] = useState<StatsMap>(() => generateInitialStats(new RandomGenerator(currentSeed), race, klass));

  if (!isOpen) return null;

  const totalStats = PRIME_STATS.reduce((sum, stat) => sum + (stats[stat] || 0), 0);

  const getTotalColor = (total: number) => {
    if (total >= 81) return '#ef4444'; // Red
    if (total > 72) return '#eab308'; // Yellow
    if (total <= 45) return '#6b7280'; // Grey
    if (total < 54) return '#9ca3af'; // Silver
    return 'var(--panel-bg)';
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
    resetGame(name.trim(), race, klass, stats);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="creator-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="creator-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Progress Quest - New Character
          </h2>
          <button className="btn" onClick={onClose} aria-label="Close character creator modal" style={{ padding: '0.25rem 0.5rem' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Name & Random Name Generator */}
          <div>
            <label htmlFor="character-name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Character Name
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="character-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--panel-border)',
                  background: 'var(--progress-bg)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                }}
              />
              <button type="button" className="btn" onClick={handleRandomName} title="Generate Random Name">
                <Sparkles size={16} /> Random
              </button>
            </div>
          </div>

          {/* Stat Roller with Total Sum Display */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Prime Stats (3d6 Rolls)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Total:</span>
                <span
                  className="badge"
                  style={{
                    backgroundColor: getTotalColor(totalStats),
                    color: totalStats > 72 ? '#000000' : '#ffffff',
                    fontSize: '0.875rem',
                    padding: '0.25rem 0.625rem',
                  }}
                >
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

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-primary" onClick={handleRoll} style={{ flex: 1, justifyContent: 'center' }}>
                <Dices size={16} /> Roll 'Em
              </button>
              <button type="button" className="btn" onClick={handleUnroll} disabled={seedHistory.length === 0} style={{ flex: 1, justifyContent: 'center' }}>
                Unroll (Undo)
              </button>
            </div>
          </div>

          {/* Race & Class Pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Select Race
              </label>
              <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '0.375rem', padding: '0.375rem', background: 'var(--progress-bg)' }}>
                {RACES.map((r) => (
                  <label key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.2rem 0', fontSize: '0.875rem', cursor: 'pointer' }}>
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
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                Select Class
              </label>
              <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '0.375rem', padding: '0.375rem', background: 'var(--progress-bg)' }}>
                {KLASSES.map((k) => (
                  <label key={k.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.2rem 0', fontSize: '0.875rem', cursor: 'pointer' }}>
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

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
            <UserPlus size={16} /> Sold! Start Questing
          </button>
        </form>
      </div>
    </div>
  );
};
