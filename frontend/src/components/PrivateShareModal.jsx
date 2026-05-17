import React, { useState } from 'react';
import { Shield, X, Loader2, UserPlus, Clock, Lock, CheckCircle } from 'lucide-react';
import { createPrivateShareApi, lookupUsersApi } from '../store/fileApi';
import '../styles/ShareModal.css';

const PERMS = [
  { key: 'can_view', label: 'View' },
  { key: 'can_download', label: 'Download' },
  { key: 'can_reshare', label: 'Re-share' },
  { key: 'can_comment', label: 'Comment' },
];

const WEEKDAYS = [
  { v: 0, l: 'Mon' }, { v: 1, l: 'Tue' }, { v: 2, l: 'Wed' },
  { v: 3, l: 'Thu' }, { v: 4, l: 'Fri' }, { v: 5, l: 'Sat' }, { v: 6, l: 'Sun' },
];

export default function PrivateShareModal({ file, isOpen, onClose, onSuccess }) {
  const [emails, setEmails] = useState([]);
  const [verifiedEmails, setVerifiedEmails] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [password, setPassword] = useState('');
  const [oneTime, setOneTime] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState('');
  const [inactivityDays, setInactivityDays] = useState('');
  const [enableTimeWindow, setEnableTimeWindow] = useState(false);
  const [windowStart, setWindowStart] = useState('09:00');
  const [windowEnd, setWindowEnd] = useState('17:00');
  const [windowDays, setWindowDays] = useState([0, 1, 2, 3, 4]);
  const [defaultPerms, setDefaultPerms] = useState({
    can_view: true, can_download: true, can_reshare: false, can_comment: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  if (!isOpen) return null;

  const currentUserEmail = (JSON.parse(localStorage.getItem('auth_user') || '{}').email || '').toLowerCase();

  const addEmail = async (val) => {
    const email = val.trim().replace(/,$/, '').toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return;
    }
    if (emails.includes(email)) return;

    if (email === currentUserEmail) {
      setError('You cannot share a file with yourself. Use a different recipient account.');
      return;
    }

    setError('');
    try {
      const { data } = await lookupUsersApi([email]);
      const hit = Array.isArray(data) ? data.find((d) => d.email === email) : null;
      if (!hit?.registered) {
        setError(`${email} is not registered. They must sign up on CloudShare first.`);
        return;
      }
      setVerifiedEmails((prev) => ({ ...prev, [email]: hit.display_name || email }));
    } catch {
      setError('Could not verify user. Check that the backend is running.');
      return;
    }

    setEmails((prev) => [...prev, email]);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (['Enter', 'Tab', ','].includes(e.key)) {
      e.preventDefault();
      addEmail(inputValue);
    }
  };

  const toggleDay = (day) => {
    setWindowDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputValue.trim()) await addEmail(inputValue);
    if (emails.length === 0) {
      setError('Add at least one registered recipient email.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessInfo('');
    try {
      const expiresAt = new Date(Date.now() + Number(expiresInHours) * 3600000).toISOString();
      const recipient_permissions = {};
      emails.forEach((email) => {
        recipient_permissions[email] = { ...defaultPerms };
      });
      const time_windows = enableTimeWindow
        ? [{ days: windowDays, start: windowStart, end: windowEnd }]
        : [];

      const { data } = await createPrivateShareApi({
        file_id: file.id,
        recipient_emails: emails,
        recipient_permissions,
        message,
        expires_at: expiresAt,
        password: password || undefined,
        one_time_access: oneTime,
        max_downloads: maxDownloads ? Number(maxDownloads) : null,
        inactivity_revoke_days: inactivityDays ? Number(inactivityDays) : null,
        time_windows,
      });

      setSuccessInfo(data.message || 'File shared successfully.');
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      const errData = err.response?.data;
      let errMsg = errData?.error || errData?.detail || 'Failed to create private share.';
      if (errData && typeof errData === 'object' && !errData.error) {
        errMsg = Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal-card private-share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Shield size={18} className="text-rose" />
            <h3>Private share</h3>
          </div>
          <button type="button" className="close-x-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <p className="modal-subtitle">
          Share <strong>{file?.original_name}</strong> with another <strong>registered</strong> CloudShare user.
        </p>

        <p className="private-share-hint">
          Recipients see the file under <strong>Shared With Me</strong> when logged in.
          Without SMTP in <code>backend/.env</code>, notifications are saved to
          <code> backend/sent_emails/</code> (not Gmail).
        </p>

        {error && <div className="modal-error-alert">{error}</div>}
        {successInfo && (
          <div className="modal-success-alert">
            <CheckCircle size={16} /> {successInfo}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="input-group">
            <label><UserPlus size={14} /> Recipient email (must be registered)</label>
            <div className="email-chips-container">
              {emails.map((email) => (
                <div key={email} className="email-chip verified">
                  <span>{verifiedEmails[email] ? `${verifiedEmails[email]} · ` : ''}{email}</span>
                  <X size={14} onClick={() => setEmails(emails.filter((e) => e !== email))} className="remove-chip-icon" />
                </div>
              ))}
              <input
                className="chip-input"
                placeholder="other-user@email.com"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => inputValue && addEmail(inputValue)}
              />
            </div>
          </div>

          <div className="perm-grid">
            <label>Default permissions</label>
            <div className="perm-toggles">
              {PERMS.map((p) => (
                <label key={p.key} className="perm-toggle">
                  <input
                    type="checkbox"
                    checked={defaultPerms[p.key]}
                    onChange={(e) => setDefaultPerms({ ...defaultPerms, [p.key]: e.target.checked })}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="input-row">
            <div className="input-group" style={{ flex: 1 }}>
              <label><Clock size={14} /> Expires in (hours)</label>
              <input type="number" className="modal-input" value={expiresInHours} min={1} max={720}
                onChange={(e) => setExpiresInHours(e.target.value)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label><Lock size={14} /> Password (optional)</label>
              <input type="password" className="modal-input" value={password} placeholder="Extra layer"
                onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          <div className="checkbox-row">
            <label><input type="checkbox" checked={oneTime} onChange={(e) => setOneTime(e.target.checked)} /> One-time access</label>
          </div>

          <div className="input-group">
            <label>Message</label>
            <textarea className="modal-textarea" value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional message..." />
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="share-submit-btn" disabled={loading || !!successInfo}>
              {loading ? <><Loader2 size={16} className="spinner" /> Sharing...</> : `Share with ${emails.length} user(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
