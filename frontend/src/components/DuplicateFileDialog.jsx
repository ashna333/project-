import React, { useState } from 'react';
import { AlertTriangle, X, Copy, RefreshCw, Trash2 } from 'lucide-react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import '../styles/DuplicateFileDialog.css';

const ACTIONS = [
  { id: 'replace', label: 'Replace', icon: RefreshCw, desc: 'Overwrite the existing file' },
  { id: 'keep_both', label: 'Keep both', icon: Copy, desc: 'Save as a separate copy' },
  { id: 'discard', label: 'Discard', icon: Trash2, desc: 'Skip this upload' },
];

export default function DuplicateFileDialog({ conflicts, onConfirm, onCancel }) {
  useBodyScrollLock(!!conflicts?.length);
  const [choices, setChoices] = useState(() =>
    Object.fromEntries(conflicts.map((c) => [c.name, 'replace']))
  );

  const setChoice = (name, action) => {
    setChoices((prev) => ({ ...prev, [name]: action }));
  };

  const applyToAll = (action) => {
    setChoices(Object.fromEntries(conflicts.map((c) => [c.name, action])));
  };

  return (
    <div className="dup-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="dup-card" onClick={(e) => e.stopPropagation()}>
        <div className="dup-header">
          <AlertTriangle size={22} className="text-amber" />
          <h3>Duplicate files detected</h3>
          <button type="button" className="dup-close" onClick={onCancel}><X size={20} /></button>
        </div>
        <p className="dup-subtitle">
          These files match content already in your library. Choose what to do for each.
        </p>
        <div className="dup-apply-all">
          <span>Apply to all:</span>
          {ACTIONS.map((a) => (
            <button key={a.id} type="button" className="dup-apply-btn" onClick={() => applyToAll(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
        <div className="dup-list">
          {conflicts.map((c) => (
            <div key={c.name} className="dup-item">
              <div className="dup-item-info">
                <strong>{c.name}</strong>
                <span>Matches: {c.existing_name}</span>
              </div>
              <div className="dup-item-actions">
                {ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      title={a.desc}
                      className={`dup-action-btn ${choices[c.name] === a.id ? 'active' : ''}`}
                      onClick={() => setChoice(c.name, a.id)}
                    >
                      <Icon size={14} />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="dup-footer">
          <button type="button" className="dup-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="dup-confirm" onClick={() => onConfirm(choices)}>Continue upload</button>
        </div>
      </div>
    </div>
  );
}
