import { Scroll } from 'lucide-react';
import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { describeGameNumber, formatGameNumber } from '../engine/text';
import { useGameStore } from '../state/gameStore';
import { projectWorld } from '../state/worldContext';
import { TENOR_LABELS, tenorFor, tenorLine } from '../state/institutionalTenor';
import { townServices } from '../state/townServices';
import { attendanceLabel, raidMuster } from '../state/raidMuster';
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
  const character = useGameStore((state) => state.character);
  const progression = useGameStore((state) => state.progression);
  const sessionGeneration = useGameStore((state) => state.sessionGeneration);
  const world = projectWorld({ kind: 'current', state: { character, progression } }).context;
  const services = townServices(world);
  const muster = raidMuster(world);
  const feedRef = useRef<HTMLDivElement>(null);
  const activityPanelRef = useRef<HTMLElement>(null);
  const chatterTabRef = useRef<HTMLButtonElement>(null);
  const activityTabRef = useRef<HTMLButtonElement>(null);
  const activityFollowingLatest = useRef(true);
  const pendingTabFocus = useRef<'chatter' | 'activity' | null>(null);
  const latest = log[0];
  const latestId = latest?.id;
  const initialLatestId = useRef(latest?.id);
  const [activeView, setActiveView] = useState<'chatter' | 'activity'>('chatter');
  const [showActivityJump, setShowActivityJump] = useState(false);
  const consoleId = useId();
  const chatterTabId = `${consoleId}-chatter-tab`;
  const activityTabId = `${consoleId}-activity-tab`;
  const chatterPanelId = `${consoleId}-chatter-panel`;
  const activityPanelId = `${consoleId}-activity-panel`;
  const chatterTruthId = `${consoleId}-chatter-truth`;
  const activityTruthId = `${consoleId}-activity-truth`;

  useLayoutEffect(() => {
    if (latestId === undefined) {
      activityFollowingLatest.current = true;
      setShowActivityJump(false);
      return;
    }
    if (activeView !== 'activity') return;
    if (activityFollowingLatest.current) {
      if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
      setShowActivityJump(false);
    } else {
      setShowActivityJump(true);
    }
  }, [activeView, latestId]);

  useLayoutEffect(() => {
    const focused = document.activeElement;
    if (focused === activityTabRef.current || (focused instanceof Node && activityPanelRef.current?.contains(focused))) {
      pendingTabFocus.current = 'chatter';
    }
    setActiveView('chatter');
    activityFollowingLatest.current = true;
    setShowActivityJump(false);
  }, [sessionGeneration]);

  useLayoutEffect(() => {
    if (pendingTabFocus.current !== activeView) return;
    (activeView === 'chatter' ? chatterTabRef : activityTabRef).current?.focus();
    pendingTabFocus.current = null;
  }, [activeView]);

  const jumpToLatestActivity = () => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
      feedRef.current.focus();
    }
    activityFollowingLatest.current = true;
    setShowActivityJump(false);
  };

  const activateView = (view: 'chatter' | 'activity', focus = false) => {
    if (focus) pendingTabFocus.current = view;
    setActiveView(view);
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, view: 'chatter' | 'activity') => {
    let next: 'chatter' | 'activity' | undefined;
    if (event.key === 'ArrowRight') next = view === 'chatter' ? 'activity' : 'chatter';
    else if (event.key === 'ArrowLeft') next = view === 'activity' ? 'chatter' : 'activity';
    else if (event.key === 'Home') next = 'chatter';
    else if (event.key === 'End') next = 'activity';
    if (!next) return;
    event.preventDefault();
    // Both bounded panels are local and already mounted, so automatic activation is immediate.
    activateView(next, true);
  };

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
          <h2 id="log-heading">World Console</h2>
        </div>
      </div>

      <div className="sr-only" role="status" aria-label="Latest activity" aria-live="polite" aria-atomic="true">
        {latest?.id === initialLatestId.current ? '' : latest?.message}
      </div>

      <section className="world-context" role="region" aria-label="Current world context">
        <span className="world-context-truth">Fictional world · activity-derived</span>
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
          <span>tenor // {TENOR_LABELS[tenorFor(world)].toLowerCase()}</span>
        </div>
        {/* The institution's opinion of itself, which is the only thing here that changes by
            degree rather than by counting up. Every line is literally true of a hero filing
            paperwork and killing rats; only the confidence moves. */}
        <p className="world-context-tenor">{tenorLine(world)}</p>
        {/* A town used to be a name with nothing in it. These offices do nothing the engine does
            not already do — two of them name a real transaction and the rest are departments the
            institution keeps regardless, which is the point. */}
        {services && (
          <ul className="world-context-services" aria-label="Offices open in this settlement">
            {services.map((office) => <li key={office}>{office}</li>)}
          </ul>
        )}
        {/* The artefact a raid actually produced: an attendance sheet. Everyone named is from the
            cast the chatter panel already declares fictional, and nobody's attendance changes the
            encounter, which is resolved by opponent puissance and level as it is everywhere. */}
        {muster && (
          <ul className="world-context-services" aria-label="Muster sheet for this raid, fictional">
            {muster.map((entry) => (
              <li key={entry.name}>{entry.name} · {entry.role} · {attendanceLabel(entry.attendance)}</li>
            ))}
          </ul>
        )}
        <details className="world-context-details">
          <summary>World filings{worldNotices.length > 0 ? ` (${worldNotices.length})` : ''}</summary>
          <div className="world-context-notices" role="region" tabIndex={0} aria-label="Derived world notices">
            {worldNotices.length > 0
              ? worldNotices.toReversed().map((entry) => <p key={entry.id}>{entry.text}</p>)
              : <p>No derived notices. The world is between forms.</p>}
          </div>
        </details>
      </section>

      <div className="console-tabs" role="tablist" aria-label="World Console views">
        <button
          ref={chatterTabRef}
          id={chatterTabId}
          type="button"
          role="tab"
          aria-label="Chatter"
          aria-describedby={chatterTruthId}
          aria-selected={activeView === 'chatter'}
          aria-controls={chatterPanelId}
          tabIndex={activeView === 'chatter' ? 0 : -1}
          onClick={() => activateView('chatter')}
          onKeyDown={(event) => onTabKeyDown(event, 'chatter')}
        >
          <span>Chatter</span>
          <small id={chatterTruthId}>Fictional · automated · zero online</small>
        </button>
        <button
          ref={activityTabRef}
          id={activityTabId}
          type="button"
          role="tab"
          aria-label="Activity"
          aria-describedby={activityTruthId}
          aria-selected={activeView === 'activity'}
          aria-controls={activityPanelId}
          tabIndex={activeView === 'activity' ? 0 : -1}
          onClick={() => activateView('activity')}
          onKeyDown={(event) => onTabKeyDown(event, 'activity')}
        >
          <span>Activity</span>
          <small id={activityTruthId}>Authoritative record</small>
        </button>
      </div>

      <section
        id={chatterPanelId}
        className="console-panel"
        role="tabpanel"
        aria-labelledby={chatterTabId}
        hidden={activeView !== 'chatter'}
      >
        <ChatterFeed active={activeView === 'chatter'} />
      </section>

      <section
        ref={activityPanelRef}
        id={activityPanelId}
        className="console-panel activity-console-panel"
        role="tabpanel"
        aria-labelledby={activityTabId}
        hidden={activeView !== 'activity'}
      >
        <div
          ref={feedRef}
          className="log-feed"
          role="region"
          tabIndex={0}
          aria-label="Activity Event Log"
          onScroll={(event) => {
            if (activeView !== 'activity') return;
            const feed = event.currentTarget;
            activityFollowingLatest.current = feed.scrollHeight - feed.scrollTop - feed.clientHeight <= 2;
            setShowActivityJump(!activityFollowingLatest.current);
          }}
        >
          {log.toReversed().map((entry) => (
            <div className="log-entry log-entry-animated" key={entry.id} data-activity-id={entry.id}>
              {getLogTag(entry.message)}
              <span>{entry.message}</span>
              {/* Native disclosure so it is keyboard-operable and screen-reader-announced without
                  any state of its own. Subordinate to the line above it, and closed by default:
                  the chronological record is the feed, and this is a footnote to one entry. */}
              {entry.reason !== undefined && (
                <details className="log-reason">
                  <summary>Why</summary>
                  <span>{entry.reason}</span>
                </details>
              )}
            </div>
          ))}
        </div>
        {showActivityJump ? <button type="button" className="btn btn-compact activity-jump" onClick={jumpToLatestActivity}>Jump to latest activity</button> : null}
      </section>
    </section>
  );
};
