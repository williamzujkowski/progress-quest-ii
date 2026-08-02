import { FolderOpen, Moon, Pause, Play, Sun } from 'lucide-react';
import React from 'react';
import { useGameStore } from '../state/gameStore';

interface NavbarProps {
  theme: 'dark' | 'progros';
  onToggleTheme: () => void;
  onOpenSaveModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, onToggleTheme, onOpenSaveModal }) => {
  const { character, isPaused, togglePause } = useGameStore();

  return (
    <header className="navbar">
      <div className="brand">
        <span>⚔️ Progress Quest</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
          {character.Traits.Name} (Lvl {character.Traits.Level})
        </span>
      </div>

      <div className="nav-actions">
        <button className="btn" onClick={togglePause} title={isPaused ? 'Resume Game' : 'Pause Game'}>
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <button className="btn" onClick={onOpenSaveModal} title="Roster & Save Manager">
          <FolderOpen size={16} />
          <span>Roster & Saves</span>
        </button>

        <button className="btn" onClick={onToggleTheme} title="Toggle Visual Theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Retro ProgrOS' : 'Dark Mode'}</span>
        </button>
      </div>
    </header>
  );
};
