import { RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { registerPwa, type PwaNotice } from '../pwa';

export const PwaStatus: React.FC = () => {
  const [notice, setNotice] = useState<PwaNotice | null>(null);

  useEffect(() => registerPwa(setNotice), []);
  if (!notice) return null;

  return (
    <aside className="pwa-status" role="status" aria-live="polite" aria-busy={notice.kind === 'applying'}>
      <span>{notice.message}</span>
      {notice.kind === 'update' || notice.kind === 'retry' ? (
        <button className="btn btn-compact" type="button" onClick={notice.apply}>
          <RefreshCw size={14} aria-hidden="true" /> {notice.kind === 'retry' ? 'Retry update' : 'Update now'}
        </button>
      ) : null}
    </aside>
  );
};
