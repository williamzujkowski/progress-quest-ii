import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import './App.css';
import { CharacterCreatorModal } from './components/CharacterCreatorModal';
import { CharacterSheetView } from './components/CharacterSheet';
import { HeroBanner } from './components/HeroBanner';
import { InventoryView } from './components/InventoryView';
import { LogFeed } from './components/LogFeed';
import { Navbar } from './components/Navbar';
import { PwaStatus } from './components/PwaStatus';
import { QuestLog } from './components/QuestLog';
import { SaveModal } from './components/SaveModal';
import { useGameStore } from './state/gameStore';
import { startGameClock } from './state/gameClock';
import { diagnostics } from './state/diagnostics';
import type { SessionCheckpointController } from './state/sessionCheckpoint';
import { applyTheme, readThemePreference, resolveInitialTheme, type ThemeId, writeThemePreference } from './theme';

const THEME_READ_FAILURE = 'Theme preference unavailable; using your system default.';
const THEME_WRITE_FAILURE = 'Theme changed, but this browser could not remember it.';

interface ThemeSelection {
  id: ThemeId;
  status: string;
  persistPending: boolean;
}

interface AppProps {
  sessionCheckpoints?: SessionCheckpointController;
}

const SessionCheckpointStatus: React.FC<{ controller: SessionCheckpointController }> = ({ controller }) => {
  const notice = useSyncExternalStore(controller.subscribe, controller.getNotice, controller.getNotice);
  if (!notice) return null;
  return (
    <aside className="session-status" role={notice.kind} aria-live={notice.kind === 'status' ? 'polite' : 'assertive'} aria-atomic="true">
      <span>{notice.message}</span>
      {notice.canRepair ? <button className="btn btn-compact" type="button" onClick={controller.repair}>{notice.repairLabel}</button> : null}
    </aside>
  );
};

export const App: React.FC<AppProps> = ({ sessionCheckpoints }) => {
  const initialThemeReadError = useRef<unknown>(undefined);
  const [themeSelection, setThemeSelection] = useState<ThemeSelection>(() => {
    const storedTheme = readThemePreference();
    if (!storedTheme.ok) initialThemeReadError.current = storedTheme.error;
    return {
      id: resolveInitialTheme(storedTheme.ok ? storedTheme.value : null, window.matchMedia('(prefers-color-scheme: dark)').matches),
      status: storedTheme.ok ? '' : THEME_READ_FAILURE,
      persistPending: false,
    };
  });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isCharacterCreatorOpen, setIsCharacterCreatorOpen] = useState(false);
  const tick = useGameStore((state) => state.tick);

  useLayoutEffect(() => {
    if (initialThemeReadError.current) {
      diagnostics.record({
        code: 'theme_read_failed',
        severity: 'warning',
        subsystem: 'theme',
        operation: 'read',
        outcome: 'failed',
        source: 'theme-preference',
        error: initialThemeReadError.current,
      });
      initialThemeReadError.current = undefined;
    }
    applyTheme(document.documentElement, themeSelection.id);
    if (!themeSelection.persistPending) return;
    const writeResult = writeThemePreference(themeSelection.id);
    if (!writeResult.ok) {
      diagnostics.record({
        code: 'theme_write_failed',
        severity: 'warning',
        subsystem: 'theme',
        operation: 'write',
        outcome: 'failed',
        source: 'theme-preference',
        error: writeResult.error,
      });
    }
    setThemeSelection((current) => {
      if (current.id !== themeSelection.id) return current;
      const status = writeResult.ok ? current.status : THEME_WRITE_FAILURE;
      return { ...current, status, persistPending: false };
    });
  }, [themeSelection.id, themeSelection.persistPending]);

  // Main 50ms tick game loop timer
  useEffect(() => {
    return startGameClock(tick, undefined, (error) => {
      diagnostics.record({
        code: 'game_tick_failed',
        severity: 'error',
        subsystem: 'browser',
        operation: 'event-handler',
        outcome: 'failed',
        source: 'game-clock',
        error,
      });
    });
  }, [tick]);

  return (
    <div className="app-container">
      <a className="skip-link" href="#game-dashboard">Skip to game dashboard</a>
      <Navbar
        theme={themeSelection.id}
        themeStatus={themeSelection.status}
        onThemeChange={(id) => setThemeSelection({ id, status: '', persistPending: true })}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        onOpenCharacterCreator={() => setIsCharacterCreatorOpen(true)}
      />
      <PwaStatus />
      {sessionCheckpoints ? <SessionCheckpointStatus controller={sessionCheckpoints} /> : null}

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
