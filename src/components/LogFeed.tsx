import { Scroll } from 'lucide-react';
import React from 'react';
import { useGameStore } from '../state/gameStore';

export const LogFeed: React.FC = () => {
  const { log } = useGameStore();

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Scroll size={18} />
          <span>Activity Log</span>
        </div>
      </div>

      <div className="log-feed">
        {log.map((entry, idx) => (
          <div className="log-entry" key={idx}>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
};
