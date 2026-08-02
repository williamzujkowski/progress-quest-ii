import React, { useEffect, useState } from 'react';
import { CharacterSheetView } from './components/CharacterSheet';
import { InventoryView } from './components/InventoryView';
import { LogFeed } from './components/LogFeed';
import { Navbar } from './components/Navbar';
import { QuestLog } from './components/QuestLog';
import { SaveModal } from './components/SaveModal';
import { useGameStore } from './state/gameStore';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'progros'>('dark');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const tick = useGameStore((state) => state.tick);

  // Set theme data attribute on body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Main 50ms tick game loop timer
  useEffect(() => {
    const timer = setInterval(() => {
      tick(50);
    }, 50);
    return () => clearInterval(timer);
  }, [tick]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'progros' : 'dark'));
  };

  return (
    <div className="app-container">
      <Navbar
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
      />

      <main className="main-grid">
        <CharacterSheetView />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <QuestLog />
          <LogFeed />
        </div>
        <InventoryView />
      </main>

      <SaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
      />
    </div>
  );
};

export default App;
