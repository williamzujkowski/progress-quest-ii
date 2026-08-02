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
    if (entry.includes('looted') || entry.includes('Item')) return <span className="log-tag tag-loot">Loot</span>;
    if (entry.includes('Quest')) return <span className="log-tag tag-quest">Quest</span>;
    if (entry.includes('LEVEL UP') || entry.includes('Act')) return <span className="log-tag tag-levelup">Level</span>;
    if (entry.includes('market') || entry.includes('Sold') || entry.includes('purchase')) return <span className="log-tag tag-market">Market</span>;
    if (entry.includes('Defeated') || entry.includes('Executing')) return <span className="log-tag tag-combat">Combat</span>;
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
