import React, { useLayoutEffect, useRef } from 'react';
import type { ProgressTask } from '../engine/types';
import { useGameStore } from '../state/gameStore';
import { ActLabel, GameNumber } from './GameNumber';
import { CHRONICLE_VARIANTS, type ChronicleVariant } from './worldChroniclePrototypeVariant';

function venueForTask(type: ProgressTask['type']): string {
  if (type === 'kill') return 'Killing fields';
  if (type === 'buying' || type === 'selling') return 'Market';
  if (type === 'heading_to_market') return 'Road to market';
  if (type === 'heading') return 'Road to killing fields';
  if (type === 'prologue') return 'Prologue transit';
  return 'Narrative transit';
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const TruthLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="chronicle-truth-label">{children}</span>
);

const Dossier: React.FC<{ task: ProgressTask }> = ({ task }) => {
  if (task.type !== 'kill') {
    return <p className="chronicle-empty">No opponent assigned to the current task. Unsupported combat values remain gloriously unmodeled.</p>;
  }
  const loot = task.loot?.type === 'fixed' ? task.loot.item : 'Random item roll';
  return (
    <dl className="chronicle-dossier">
      <div><dt>Assignment</dt><dd>{task.description}</dd></div>
      <div><dt>Scheduled</dt><dd>{Math.round(task.durationMs / 1000)} seconds</dd></div>
      <div><dt>Loot prospect</dt><dd>{loot}</dd></div>
      <div><dt>HP / DPS</dt><dd>Not modeled</dd></div>
    </dl>
  );
};

export const WorldChroniclePrototype: React.FC<{ variant: ChronicleVariant }> = ({ variant }) => {
  const { character, progression, log } = useGameStore();
  const ledgerRef = useRef<HTMLDivElement>(null);
  const latest = log[0];
  const duplicateQuestCount = character.Quest.history?.filter((entry) => entry === character.Quest.description).length ?? 0;
  const callbackClass = latest ? String.fromCharCode(65 + (latest.id % 3)) : 'A';
  const guildIsEarned = character.Plot.act > 0;

  useLayoutEffect(() => {
    if (variant === 'gazette' && ledgerRef.current) ledgerRef.current.scrollTop = ledgerRef.current.scrollHeight;
  }, [latest?.id, variant]);

  const orientation = (
    <p className="chronicle-orientation">
      <strong>{venueForTask(character.Task.type)}</strong>
      <span><ActLabel act={character.Plot.act} /> · {formatElapsed(progression.elapsedSeconds)} adventure elapsed</span>
      <span>Now // {character.Task.description}</span>
    </p>
  );

  const optionalFacts = (
    <>
      <section aria-labelledby={`${variant}-dossier-heading`}>
        <h3 id={`${variant}-dossier-heading`}>Current assignment</h3>
        <TruthLabel>Known task facts</TruthLabel>
        <Dossier task={character.Task} />
      </section>
      {guildIsEarned ? (
        <section aria-labelledby={`${variant}-guild-heading`}>
          <h3 id={`${variant}-guild-heading`}>Guild of Zero</h3>
          <TruthLabel>Fictional system texture — no real players</TruthLabel>
          <p>Raid quorum <strong>0/0</strong> · achieved by vacancy. Empty roster operating within expectations.</p>
        </section>
      ) : null}
      {duplicateQuestCount > 1 ? (
        <section aria-labelledby={`${variant}-callback-heading`}>
          <h3 id={`${variant}-callback-heading`}>Departmental callback</h3>
          <TruthLabel>Observer reclassification — no gameplay effect</TruthLabel>
          <p>Recurring docket, filing class {callbackClass}; occurrence <GameNumber value={duplicateQuestCount} /> within retained quest history.</p>
        </section>
      ) : null}
    </>
  );

  if (variant === 'gazette') {
    return (
      <section className="card chronicle-prototype chronicle-gazette" aria-labelledby="chronicle-gazette-heading">
        <header className="chronicle-gazette-header">
          <div>
            <TruthLabel>Throwaway prototype #144 · not game state</TruthLabel>
            <h2 id="chronicle-gazette-heading">The World Chronicle</h2>
          </div>
          <strong><ActLabel act={character.Plot.act} /></strong>
        </header>
        {orientation}
        <details className="chronicle-disclosure">
          <summary>Open observer’s filing cabinet</summary>
          <div className="chronicle-detail-grid" role="region" tabIndex={0} aria-label="Observer filing cabinet">{optionalFacts}</div>
        </details>
        <div
          className="chronicle-ledger"
          ref={ledgerRef}
          role="region"
          tabIndex={0}
          aria-label="Existing activity record, unchanged"
        >
          <TruthLabel>Existing activity record · unchanged</TruthLabel>
          {log.toReversed().map((entry) => <p key={entry.id}><span>№{entry.id}</span>{entry.message}</p>)}
        </div>
      </section>
    );
  }

  if (variant === 'marginalia') {
    return (
      <aside className="chronicle-prototype chronicle-marginalia" aria-label="World chronicle marginal notes">
        <TruthLabel>Prototype #144 · derived observer notes</TruthLabel>
        <div><span>Location</span><strong>{venueForTask(character.Task.type)}</strong></div>
        <div><span>Clock</span><strong>{formatElapsed(progression.elapsedSeconds)}</strong></div>
        <div><span>Dossier</span><strong>{character.Task.type === 'kill' ? 'Assignment active' : 'No opponent'}</strong></div>
        <div><span>Guild</span><strong>{guildIsEarned ? '0/0 quorum' : 'Not yet chartered'}</strong></div>
      </aside>
    );
  }

  return (
    <aside className="chronicle-prototype chronicle-rail" aria-labelledby="chronicle-rail-heading">
      <div className="chronicle-rail-status">
        <TruthLabel>Prototype #144 · observer classification</TruthLabel>
        <h2 id="chronicle-rail-heading">World // {venueForTask(character.Task.type)}</h2>
        <span><ActLabel act={character.Plot.act} /> · {formatElapsed(progression.elapsedSeconds)}</span>
        <span className="chronicle-now">Now // {character.Task.description}</span>
      </div>
      <details className="chronicle-disclosure">
        <summary>Observer detail</summary>
        <div className="chronicle-detail-grid" role="region" tabIndex={0} aria-label="Observer detail">{optionalFacts}</div>
      </details>
    </aside>
  );
};

export const ChroniclePrototypeSwitcher: React.FC<{ active: ChronicleVariant }> = ({ active }) => (
  <nav className="chronicle-switcher" aria-label="World chronicle prototype variants">
    <span>Prototype #144</span>
    {CHRONICLE_VARIANTS.map((variant) => (
      <a key={variant} href={`?chronicle=${variant}`} aria-current={active === variant ? 'page' : undefined}>{variant}</a>
    ))}
  </nav>
);
