import { FolderOpen, Palette, Pause, Play, UserPlus, Volume2, VolumeX } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { soundFX } from '../state/audio';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../state/gameStore';
import { THEME_OPTIONS, type ThemeId } from '../theme';

interface NavbarProps {
  theme: ThemeId;
  themeStatus: string;
  onThemeChange: (theme: ThemeId) => void;
  onOpenSaveModal: () => void;
  onOpenCharacterCreator: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, themeStatus, onThemeChange, onOpenSaveModal, onOpenCharacterCreator }) => {
  // Narrow on purpose: the character reference is rebuilt every 50ms tick because Task.elapsedMs
  // advances, and a bare useGameStore() would subscribe this bar to all of it. Nothing here
  // depends on the character any more.
  const { isPaused, togglePause } = useGameStore(useShallow((state) => ({
    isPaused: state.isPaused,
    togglePause: state.togglePause,
  })));
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
        <div className="brand-copy">
          <h1><span aria-hidden="true">⚔</span> Progress Quest II</h1>
          <p className="brand-tagline">
            Zero players. Zero developers. Progress continues regardless. <span aria-hidden="true">·</span>{' '}
            <a href="./THIRD_PARTY_NOTICES.txt">Credits &amp; notices</a>
          </p>
        </div>
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
            aria-describedby={themeStatus ? 'theme-status' : undefined}
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as ThemeId)}
          >
            {THEME_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        {themeStatus ? (
          <span id="theme-status" className="theme-status" role="status" aria-live="polite">
            {themeStatus}
          </span>
        ) : null}
      </div>
    </header>
  );
};
