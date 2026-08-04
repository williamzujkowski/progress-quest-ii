import React from 'react';
import { useGameStore } from '../state/gameStore';
import { ActLabel, GameNumber } from './GameNumber';

export const QuestLog: React.FC = () => {
  const { character } = useGameStore();

  const taskPct = Math.min(100, Math.floor((character.Task.elapsedMs / character.Task.durationMs) * 100));
  const questPct = Math.min(100, Math.floor((character.Quest.currentProgress / character.Quest.maxProgress) * 100));
  const plotPct = Math.min(100, Math.floor((character.Plot.currentProgress / character.Plot.maxProgress) * 100));

  return (
    <section className="card quest-card" aria-labelledby="quest-log-heading">
      <div className="card-header">
        <h2 id="quest-log-heading">Questing & Progression</h2>
        <span className="badge badge-warning"><ActLabel act={character.Plot.act} /></span>
      </div>

      <div className="progress-container progress-task">
        <div className="progress-label">
          <span>Task: {character.Task.description}</span>
          <span>{taskPct}%</span>
        </div>
        <div
          className="progress-bar-track"
          role="progressbar"
          aria-label="Current task progress"
          aria-valuenow={taskPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-bar-fill" style={{ width: `${taskPct}%` }} />
        </div>
      </div>

      <div className="progress-container progress-quest" style={{ marginTop: '0.75rem' }}>
        <div className="progress-label">
          <span>Quest: {character.Quest.description}</span>
          <span>
            <GameNumber value={character.Quest.currentProgress} /> / <GameNumber value={character.Quest.maxProgress} />
          </span>
        </div>
        <div
          className="progress-bar-track"
          role="progressbar"
          aria-label="Current quest progress"
          aria-valuenow={questPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-bar-fill" style={{ width: `${questPct}%` }} />
        </div>
      </div>

      <div className="progress-container progress-plot" style={{ marginTop: '0.75rem' }}>
        <div className="progress-label">
          <span>Plot Progress</span>
          <span>
            <GameNumber value={character.Plot.currentProgress} /> / <GameNumber value={character.Plot.maxProgress} />
          </span>
        </div>
        <div
          className="progress-bar-track"
          role="progressbar"
          aria-label="Plot act progress"
          aria-valuenow={plotPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-bar-fill" style={{ width: `${plotPct}%` }} />
        </div>
      </div>
    </section>
  );
};
