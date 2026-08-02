import React from 'react';
import { useGameStore } from '../state/gameStore';

export const QuestLog: React.FC = () => {
  const { character } = useGameStore();

  const taskPct = Math.min(100, Math.floor((character.Task.elapsedMs / character.Task.durationMs) * 100));
  const questPct = Math.min(100, Math.floor((character.Quest.currentProgress / character.Quest.maxProgress) * 100));
  const plotPct = Math.min(100, Math.floor((character.Plot.currentProgress / character.Plot.maxProgress) * 100));

  return (
    <div className="card">
      <div className="card-header">
        <span>Questing & Progression</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Act {character.Plot.act}</span>
      </div>

      <div className="progress-container progress-task">
        <div className="progress-label">
          <span>Task: {character.Task.description}</span>
          <span>{taskPct}%</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${taskPct}%` }} />
        </div>
      </div>

      <div className="progress-container progress-quest" style={{ marginTop: '0.75rem' }}>
        <div className="progress-label">
          <span>Quest: {character.Quest.description}</span>
          <span>
            {character.Quest.currentProgress} / {character.Quest.maxProgress}
          </span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${questPct}%` }} />
        </div>
      </div>

      <div className="progress-container progress-plot" style={{ marginTop: '0.75rem' }}>
        <div className="progress-label">
          <span>Plot: Act {character.Plot.act}</span>
          <span>
            {character.Plot.currentProgress} / {character.Plot.maxProgress}
          </span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${plotPct}%` }} />
        </div>
      </div>
    </div>
  );
};
