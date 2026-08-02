import { Copy, Trash2, Upload, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { CharacterSheet } from '../engine/types';
import { useGameStore } from '../state/gameStore';
import { decodePQWSave, encodePQWSave, loadRoster, removeFromRoster, saveToRoster } from '../state/saveManager';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose }) => {
  const { character, loadCharacter } = useGameStore();
  const [roster, setRoster] = useState<Record<string, CharacterSheet>>({});
  const [importInput, setImportInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const refreshRoster = () => {
    setRoster(loadRoster());
  };

  useEffect(() => {
    if (isOpen) {
      saveToRoster(character);
      refreshRoster();
    }
  }, [isOpen, character]);

  if (!isOpen) return null;

  const currentPQW = encodePQWSave(character);

  const handleCopyPQW = () => {
    navigator.clipboard.writeText(currentPQW);
    alert('Save data (.pqw) copied to clipboard!');
  };

  const handleImport = () => {
    setErrorMsg('');
    try {
      const sheet = decodePQWSave(importInput);
      saveToRoster(sheet);
      loadCharacter(sheet, 'import');
      refreshRoster();
      setImportInput('');
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to import save string.');
    }
  };

  const handleDeleteCharacter = (name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      removeFromRoster(name);
      refreshRoster();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="modal-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Character Roster & Save Manager</h2>
          <button className="btn" onClick={onClose} aria-label="Close modal" style={{ padding: '0.25rem 0.5rem' }}>
            <X size={16} />
          </button>
        </div>

        {/* Current Character Save Export */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Export Current Save ({character.Traits.Name}.pqw)
          </div>
          <button className="btn btn-primary" onClick={handleCopyPQW} style={{ width: '100%', justifyContent: 'center' }}>
            <Copy size={16} /> Copy Base64 .pqw Save String
          </button>
        </div>

        {/* Import Save String */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Import Save String (.pqw)</div>
          <textarea
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            placeholder="Paste base64 .pqw save string here..."
            rows={3}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--panel-border)', background: 'var(--progress-bg)', color: 'var(--text-main)', fontSize: '0.875rem' }}
          />
          {errorMsg && <div style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errorMsg}</div>}
          <button className="btn" onClick={handleImport} style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
            <Upload size={16} /> Load Character
          </button>
        </div>

        {/* Saved Roster List */}
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Saved Character Roster</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '150px', overflowY: 'auto' }}>
            {Object.values(roster).length === 0 ? (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No saved characters found.</div>
            ) : (
              Object.values(roster).map((char) => (
                <div key={char.Traits.Name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '0.375rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.875rem' }}>{char.Traits.Name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Lvl {char.Traits.Level} {char.Traits.Race} {char.Traits.Class}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button className="btn" style={{ padding: '0.25rem 0.5rem' }} onClick={() => { loadCharacter(char, 'roster'); onClose(); }}>
                      Play
                    </button>
                    <button className="btn" style={{ padding: '0.25rem 0.5rem', color: 'var(--accent-danger)' }} onClick={() => handleDeleteCharacter(char.Traits.Name)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
