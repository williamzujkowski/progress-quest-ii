import { RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { registerPwa, type PwaNotice } from '../pwa';

export const PwaStatus: React.FC = () => {
  const [notice, setNotice] = useState<PwaNotice | null>(null);

  useEffect(() => registerPwa(setNotice), []);
  if (!notice) return null;

  return (
    <aside className="pwa-status" role="status" aria-live="polite">
      <span>{notice.message}</span>
      {notice.kind === 'update' ? (
        <button className="btn btn-compact" type="button" onClick={notice.apply}>
          <RefreshCw size={14} aria-hidden="true" /> Update now
        </button>
      ) : null}
    </aside>
  );
};
