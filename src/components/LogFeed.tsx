import { Scroll } from 'lucide-react';
import React, { useLayoutEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';

export const LogFeed: React.FC = () => {
  const { log } = useGameStore();
  const feedRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [log]);

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
          <h2 id="log-heading">Activity Log</h2>
        </div>
      </div>

      <div
        ref={feedRef}
        className="log-feed"
        role="region"
        tabIndex={0}
        aria-label="Activity Event Log"
        aria-live="polite"
      >
        {log.toReversed().map((entry, idx) => (
          <div className="log-entry log-entry-animated" key={idx}>
            {getLogTag(entry)}
            <span>{entry}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
