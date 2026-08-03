import { FolderOpen, Palette, Pause, Play, UserPlus, Volume2, VolumeX } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { soundFX } from '../state/audio';
import { useGameStore } from '../state/gameStore';
import { THEME_OPTIONS, type ThemeId } from '../theme';

interface NavbarProps {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  onOpenSaveModal: () => void;
  onOpenCharacterCreator: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, onThemeChange, onOpenSaveModal, onOpenCharacterCreator }) => {
  const { character, isPaused, togglePause } = useGameStore();
  const [isMuted, setIsMuted] = useState(soundFX.getMuted());
  const [audioStatus, setAudioStatus] = useState('');

  useEffect(() => soundFX.subscribe((message) => {
    setAudioStatus(message);
    setIsMuted(true);
  }), []);

  const handleToggleAudio = async () => {
    const muted = soundFX.toggleMute();
    setIsMuted(muted);
    if (muted) return;

    const result = await soundFX.prepare();
    if (result.ok) setAudioStatus('');
    setIsMuted(soundFX.getMuted());
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
          title={audioStatus ? 'Retry Sound Effects' : isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          aria-describedby={audioStatus ? 'audio-status' : undefined}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span>{audioStatus ? 'Retry audio' : isMuted ? 'Muted' : 'Audio'}</span>
        </button>
        {audioStatus ? (
          <span id="audio-status" className="audio-status sr-only" role="status" aria-live="polite">
            {audioStatus}
          </span>
        ) : null}

        <button
          className="btn"
          onClick={onOpenSaveModal}
          title="Character Roster and Save Manager"
        >
          <FolderOpen size={16} />
          <span>Roster & Saves</span>
        </button>

        <label className="theme-control">
          <Palette size={16} aria-hidden="true" />
          <span>Theme</span>
          <select
            aria-label="Visual theme"
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as ThemeId)}
          >
            {THEME_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
};
