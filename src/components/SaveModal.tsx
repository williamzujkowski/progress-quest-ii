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
  const { character, startSession } = useGameStore();
  const [roster, setRoster] = useState<Record<string, CharacterSheet>>({});
  const [importInput, setImportInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const refreshRoster = () => {
    setRoster(loadRoster());
  };

  useEffect(() => {
    if (isOpen) {
      const result = saveToRoster(character);
      if (!result.ok) setErrorMsg(result.error.message);
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
    const result = decodePQWSave(importInput);
    if (!result.ok) {
      setErrorMsg(result.error.message);
      return;
    }

    const saved = saveToRoster(result.value);
    if (!saved.ok) {
      setErrorMsg(saved.error.message);
      return;
    }

    startSession({ source: 'import', character: result.value });
    refreshRoster();
    setImportInput('');
    onClose();
  };

  const handleDeleteCharacter = (name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      const result = removeFromRoster(name);
      if (!result.ok) {
        setErrorMsg(result.error.message);
        return;
      }
      refreshRoster();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">Character Roster & Save Manager</h2>
          <button className="btn btn-compact" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Current Character Save Export */}
        <div className="surface-panel">
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Export Current Save ({character.Traits.Name}.pqw)
          </div>
          <button className="btn btn-primary btn-block" onClick={handleCopyPQW}>
            <Copy size={16} /> Copy Base64 .pqw Save String
          </button>
        </div>

        {/* Import Save String */}
        <div className="surface-panel">
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Import Save String (.pqw)</div>
          <textarea
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            placeholder="Paste base64 .pqw save string here..."
            rows={3}
            className="form-control"
          />
          {errorMsg && <div style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errorMsg}</div>}
          <button className="btn btn-block" onClick={handleImport} style={{ marginTop: '0.5rem' }}>
            <Upload size={16} /> Load Character
          </button>
        </div>

        {/* Saved Roster List */}
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Saved Character Roster</div>
          <div className="roster-list">
            {Object.values(roster).length === 0 ? (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No saved characters found.</div>
            ) : (
              Object.values(roster).map((char) => (
                <div className="roster-item" key={char.Traits.Name}>
                  <div>
                    <strong style={{ fontSize: '0.875rem' }}>{char.Traits.Name}</strong>
                    <div className="roster-meta">
                      Lvl {char.Traits.Level} {char.Traits.Race} {char.Traits.Class}
                    </div>
                  </div>
                  <div className="roster-actions">
                    <button className="btn btn-compact" onClick={() => { startSession({ source: 'roster', character: char }); onClose(); }}>
                      Play
                    </button>
                    <button className="btn btn-compact btn-danger" aria-label={`Delete ${char.Traits.Name}`} onClick={() => handleDeleteCharacter(char.Traits.Name)}>
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
