import { Scroll } from 'lucide-react';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { describeGameNumber, formatGameNumber } from '../engine/text';
import { useGameStore } from '../state/gameStore';
import { projectWorld } from '../state/worldContext';
import { ActLabel } from './GameNumber';
import { ChatterFeed } from './ChatterFeed';

function formatElapsed(totalSeconds: number): string {
  if (totalSeconds >= 1_000_000) return `${formatGameNumber(totalSeconds)}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatElapsedForSpeech(totalSeconds: number): string {
  if (totalSeconds >= 1_000_000) return `${totalSeconds.toLocaleString('en-US')} seconds`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [
    ...(hours ? [`${hours} ${hours === 1 ? 'hour' : 'hours'}`] : []),
    ...(minutes ? [`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`] : []),
    `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`,
  ].join(', ');
}

export const LogFeed: React.FC = () => {
  const log = useGameStore((state) => state.log);
  const worldNotices = useGameStore((state) => state.worldNotices);
  const socialEntries = useGameStore((state) => state.socialEntries);
  const character = useGameStore((state) => state.character);
  const progression = useGameStore((state) => state.progression);
  const world = projectWorld({ kind: 'current', state: { character, progression } }).context;
  const feedRef = useRef<HTMLDivElement>(null);
  const latest = log[0];
  const initialLatestId = useRef(latest?.id);
  const [chatterOpen, setChatterOpen] = useState(false);

  useLayoutEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [latest?.id]);

  const getLogTag = (entry: string) => {
    if (entry.startsWith('Defeated monster and looted ') || entry.startsWith('Item ')) return <span className="log-tag tag-loot">Loot</span>;
    if (entry.startsWith('Quest completed:')) return <span className="log-tag tag-quest">Quest</span>;
    if (entry.startsWith('LEVEL UP!') || entry.startsWith('Act ')) return <span className="log-tag tag-levelup">Level</span>;
    if (entry.startsWith('Negotiated purchase:')) return <span className="log-tag tag-market">Market</span>;
    if (entry.startsWith('Defeated ') || entry.startsWith('Executing ')) return <span className="log-tag tag-combat">Combat</span>;
    return null;
  };

  return (
    <section className="card activity-card" aria-labelledby="log-heading">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Scroll size={18} />
          <h2 id="log-heading">Console</h2>
        </div>
        <details className="chatter-disclosure" onToggle={(event) => setChatterOpen(event.currentTarget.open)}>
          <summary>Automated chatter · zero online · messages unsent{socialEntries.length > 0 ? ` (${socialEntries.length})` : ''}</summary>
          <ChatterFeed active={chatterOpen} />
        </details>
      </div>

      <div className="sr-only" role="status" aria-label="Latest activity" aria-live="polite" aria-atomic="true">
        {latest?.id === initialLatestId.current ? '' : latest?.message}
      </div>

      <section className="world-context" role="region" aria-label="Current world context">
        <span className="world-context-truth">Fictional world · derived from canonical activity</span>
        <div className="world-context-line">
          <strong>
            <span aria-hidden="true">LOOK // {world.location}</span>
            <span className="sr-only">Look: {world.spokenLocation}</span>
          </strong>
          <span>
            <span aria-hidden="true"><ActLabel act={world.act} /> · {formatElapsed(world.elapsedSeconds)} adventure elapsed</span>
            <span className="sr-only">{world.act === 0 ? 'Prologue' : `Act ${describeGameNumber(world.act)}`} · {formatElapsedForSpeech(world.elapsedSeconds)} adventure elapsed</span>
          </span>
        </div>
        <div className="world-context-line world-context-meta">
          <span>{world.venue} // {world.activity}</span>
          {world.assignmentScope ? <span>assignment // {world.assignmentScope}</span> : null}
        </div>
        <details className="world-context-details">
          <summary>World filings{worldNotices.length > 0 ? ` (${worldNotices.length})` : ''}</summary>
          <div className="world-context-notices" role="region" tabIndex={0} aria-label="Derived world notices">
            {worldNotices.length > 0
              ? worldNotices.toReversed().map((entry) => <p key={entry.id}>{entry.text}</p>)
              : <p>No derived notices. The world is between forms.</p>}
          </div>
        </details>
      </section>

      <div
        ref={feedRef}
        className="log-feed"
        role="region"
        tabIndex={0}
        aria-label="Activity Event Log"
      >
        {log.toReversed().map((entry) => (
          <div className="log-entry log-entry-animated" key={entry.id} data-activity-id={entry.id}>
            {getLogTag(entry.message)}
            <span>{entry.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
