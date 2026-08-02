import { FolderOpen, Moon, Pause, Play, Sun, UserPlus, Volume2, VolumeX } from 'lucide-react';
import React, { useState } from 'react';
import { soundFX } from '../engine/audio';
import { useGameStore } from '../state/gameStore';

interface NavbarProps {
  theme: 'dark' | 'progros';
  onToggleTheme: () => void;
  onOpenSaveModal: () => void;
  onOpenCharacterCreator: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, onToggleTheme, onOpenSaveModal, onOpenCharacterCreator }) => {
  const { character, isPaused, togglePause } = useGameStore();
  const [isMuted, setIsMuted] = useState(soundFX.getMuted());

  const handleToggleAudio = () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="navbar" role="banner">
      <div className="brand">
        <h1><span aria-hidden="true">⚔</span> Progress Quest</h1>
        <span className="badge" title="Character Level">
          Lvl {character.Traits.Level}
        </span>
      </div>

      <div className="nav-actions">
        <button
          className="btn btn-primary"
          onClick={onOpenCharacterCreator}
          title="Roll New Character"
        >
          <UserPlus size={16} />
          <span>New Character</span>
        </button>

        <button
          className="btn"
          onClick={togglePause}
          title={isPaused ? 'Resume Game' : 'Pause Game'}
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          className="btn"
          onClick={handleToggleAudio}
          title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span>{isMuted ? 'Muted' : 'Audio'}</span>
        </button>

        <button
          className="btn"
          onClick={onOpenSaveModal}
          title="Character Roster and Save Manager"
        >
          <FolderOpen size={16} />
          <span>Roster & Saves</span>
        </button>

        <button
          className="btn"
          onClick={onToggleTheme}
          title="Toggle Visual Theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Retro ProgrOS' : 'Dark Mode'}</span>
        </button>
      </div>
    </header>
  );
};
