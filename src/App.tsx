import React, { useEffect, useLayoutEffect, useState } from 'react';
import './App.css';
import { CharacterCreatorModal } from './components/CharacterCreatorModal';
import { CharacterSheetView } from './components/CharacterSheet';
import { HeroBanner } from './components/HeroBanner';
import { InventoryView } from './components/InventoryView';
import { LogFeed } from './components/LogFeed';
import { Navbar } from './components/Navbar';
import { QuestLog } from './components/QuestLog';
import { SaveModal } from './components/SaveModal';
import { useGameStore } from './state/gameStore';
import { applyTheme, resolveInitialTheme, THEME_STORAGE_KEY, type ThemeId } from './theme';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeId>(() => {
    let storedTheme: string | null = null;
    try {
      storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // ponytail: storage is optional; a browser privacy mode must not block the game.
    }
    return resolveInitialTheme(storedTheme, window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isCharacterCreatorOpen, setIsCharacterCreatorOpen] = useState(false);
  const tick = useGameStore((state) => state.tick);

  useLayoutEffect(() => {
    applyTheme(document.documentElement, theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ponytail: keep the in-memory choice when persistence is unavailable.
    }
  }, [theme]);

  // Main 50ms tick game loop timer
  useEffect(() => {
    const timer = setInterval(() => {
      tick(50);
    }, 50);
    return () => clearInterval(timer);
  }, [tick]);

  return (
    <div className="app-container">
      <a className="skip-link" href="#game-dashboard">Skip to game dashboard</a>
      <Navbar
        theme={theme}
        onThemeChange={setTheme}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenCharacterCreator={() => setIsCharacterCreatorOpen(true)}
      />

      <HeroBanner />

      <main className="main-grid" id="game-dashboard">
        <CharacterSheetView />
        <div className="quest-column">
          <QuestLog />
          <LogFeed />
        </div>
        <InventoryView />
      </main>

      <SaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />

      <CharacterCreatorModal
        isOpen={isCharacterCreatorOpen}
        onClose={() => setIsCharacterCreatorOpen(false)}
      />
    </div>
  );
};

export default App;
