import React, { useState, useEffect } from 'react';
import { Share2, X, Loader2, UserPlus, Shield, Link, Lock, Clock, DownloadCloud, CalendarClock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { createShareApi, createPrivateShareApi, lookupUsersApi } from '../store/fileApi';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { validateEmail, validateExpiresInHours, validateShareMessage } from '../utils/validation';
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

export default function ShareModal({ file, parentShare, isOpen, onClose, onRefresh, onSuccess }) {
  useBodyScrollLock(isOpen);
  const [mode, setMode] = useState(parentShare ? 'private' : 'public');

  const [emails, setEmails] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState('');

  // Public state
  const [expiresInHours, setExpiresInHours] = useState(24);

  // Private state
  const [verifiedEmails, setVerifiedEmails] = useState({});
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [oneTime, setOneTime] = useState(false);
  const [privateExpiresInHours, setPrivateExpiresInHours] = useState(72);
  const [maxDownloads, setMaxDownloads] = useState('');
  const [enableTimeWindow, setEnableTimeWindow] = useState(false);
  const [windowStart, setWindowStart] = useState('09:00');
  const [windowEnd, setWindowEnd] = useState('17:00');
  const [windowDays, setWindowDays] = useState([0, 1, 2, 3, 4]);
  const [defaultPerms, setDefaultPerms] = useState({
    can_view: true,
    can_download: parentShare ? parentShare.can_download : true,
    can_reshare: false,
    can_comment: parentShare ? parentShare.can_comment : false,
  });

  useEffect(() => {
    if (isOpen) resetAll();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUserEmail = (JSON.parse(localStorage.getItem('auth_user') || '{}').email || '').toLowerCase();

  const resetAll = () => {
    setMode(parentShare ? 'private' : 'public');
    setEmails([]); setInputValue(''); setMessage('');
    setError(''); setLoading(false); setSuccessInfo('');
    setExpiresInHours(24);
    setVerifiedEmails({}); setEnablePassword(false); setPassword('');
    setShowPassword(false); setOneTime(false); setPrivateExpiresInHours(72);
    setMaxDownloads(''); setEnableTimeWindow(false);
    setWindowStart('09:00'); setWindowEnd('17:00'); setWindowDays([0, 1, 2, 3, 4]);
    setDefaultPerms({
      can_view: true,
      can_download: parentShare ? parentShare.can_download : true,
      can_reshare: false,
      can_comment: parentShare ? parentShare.can_comment : false,
    });
  };

  const handleClose = () => { resetAll(); onClose(); };

  const switchMode = (newMode) => {
    setMode(newMode);
    setEmails([]); setInputValue(''); setError(''); setSuccessInfo('');
  };

  const addEmailPublic = (val) => {
    const email = val.trim().replace(/,$/, '').toLowerCase();
    if (!email) return;
    const err = validateEmail(email);
    if (err) { setError(err); return; }
    if (emails.includes(email)) { setError('Already added.'); return; }
    setEmails([...emails, email]);
    setInputValue(''); setError('');
  };

  const addEmailPrivate = async (val) => {
    const email = val.trim().replace(/,$/, '').toLowerCase();
    if (!email) return;
    const err = validateEmail(email);
    if (err) { setError(err); return; }
    if (emails.includes(email)) return;
    if (email === currentUserEmail) { setError('You cannot share with yourself.'); return; }

    // Prevent resharing back to original sender
    if (parentShare) {
      const upstream = (parentShare.shared_by_email || '').toLowerCase();
      if (upstream && email === upstream) {
        setError('You cannot share this file back to the person who shared it with you.');
        return;
      }
    }

    setError('');
    try {
      const { data } = await lookupUsersApi([email]);
      const hit = Array.isArray(data) ? data.find((d) => d.email === email) : null;
      if (!hit?.registered) { setError(`${email} is not registered on CloudShare.`); return; }
      setVerifiedEmails((prev) => ({ ...prev, [email]: hit.display_name || email }));
    } catch { setError('Could not verify user.'); return; }
    setEmails((prev) => [...prev, email]);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (['Enter', 'Tab', ','].includes(e.key)) {
      e.preventDefault();
      mode === 'public' ? addEmailPublic(inputValue) : addEmailPrivate(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  };

  const handlePublicSubmit = async (e) => {
    e.preventDefault();
    if (inputValue) addEmailPublic(inputValue);
    if (emails.length === 0) { setError('Add at least one recipient.'); return; }
    const expErr = validateExpiresInHours(expiresInHours);
    if (expErr) { setError(expErr); return; }
    const msgErr = validateShareMessage(message);
    if (msgErr) { setError(msgErr); return; }
    setLoading(true);
    try {
      await Promise.all(emails.map(email =>
        createShareApi({ file_id: file.id, recipient_email: email, expires_in_hours: Number(expiresInHours), message })
      ));
      if (onRefresh) onRefresh();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to share.');
    } finally { setLoading(false); }
  };

  const handlePrivateSubmit = async (e) => {
    e.preventDefault();
    if (inputValue) await addEmailPrivate(inputValue);
    if (emails.length === 0) { setError('Add at least one recipient.'); return; }
    if (enablePassword && password.trim().length < 4) { setError('Password must be at least 4 characters.'); return; }
    const msgErr = validateShareMessage(message);
    if (msgErr) { setError(msgErr); return; }
    if (!oneTime) {
      const expErr = validateExpiresInHours(privateExpiresInHours);
      if (expErr) { setError(expErr); return; }
    }
    setLoading(true); setError(''); setSuccessInfo('');
    try {
      let expiresAt = oneTime ? null : new Date(Date.now() + Number(privateExpiresInHours) * 3600000).toISOString();

      // Cap expiry to parent share expiry
      if (expiresAt && parentShare?.expires_at) {
        if (new Date(expiresAt) > new Date(parentShare.expires_at)) {
          expiresAt = parentShare.expires_at;
        }
      }

      const recipient_permissions = {};
      emails.forEach((email) => { recipient_permissions[email] = { ...defaultPerms }; });
      const time_windows = enableTimeWindow ? [{ days: windowDays, start: windowStart, end: windowEnd }] : [];

      const { data } = await createPrivateShareApi({
        file_id: file.id,
        recipient_emails: emails,
        recipient_permissions,
        message,
        expires_at: expiresAt,
        parent_share_id: parentShare ? parentShare.share_id : undefined,
        password: enablePassword && password ? password : undefined,
        one_time_access: oneTime,
        max_downloads: maxDownloads ? Number(maxDownloads) : null,
        time_windows,
      });

      setSuccessInfo(data.message || 'File shared successfully.');
      if (onRefresh) onRefresh();
      if (onSuccess) onSuccess();
      setTimeout(() => handleClose(), 2500);
    } catch (err) {
      const errData = err.response?.data;
      let errMsg = errData?.error || errData?.detail || 'Failed to create private share.';
      if (errData && typeof errData === 'object' && !errData.error) {
        errMsg = Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
      }
      setError(errMsg);
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <UserPlus size={18} className="text-rose" />
            <h3>{parentShare ? 'Re-share file' : 'Share with people'}</h3>
          </div>
          <button className="close-x-btn" onClick={handleClose}><X size={20} /></button>
        </div>

        {/* Info box for reshare */}
        {parentShare && (
          <div className="ps-info-box">
            <Shield size={16} className="shield-icon" />
            <div>
              <strong>Re-share: {file?.original_name || file?.file_name}</strong>
              <p>Only verified recipients will be able to access this file.</p>
              
            </div>
          </div>
        )}

        {/* Tabs — hidden when resharing since it must be private */}
        {!parentShare && (
          <div className="share-mode-tabs">
            <button
              type="button"
              className={`share-mode-tab ${mode === 'public' ? 'active' : ''}`}
              onClick={() => switchMode('public')}
            >
              <Link size={14} /> Public link
            </button>
            <button
              type="button"
              className={`share-mode-tab ${mode === 'private' ? 'active' : ''}`}
              onClick={() => switchMode('private')}
            >
              <Shield size={14} /> Private share
            </button>
          </div>
        )}

        <p className="modal-subtitle">Sharing: <strong>{file?.original_name}</strong></p>

        {error && <div className="modal-error-alert">{error}</div>}
        {successInfo && <div className="modal-success-alert"><CheckCircle size={16} /> {successInfo}</div>}

        {/* ── PUBLIC FORM ── */}
        {mode === 'public' && (
          <form onSubmit={handlePublicSubmit} className="modal-form">
            <div className="input-group">
              <label>Recipients</label>
              <div className="email-chips-container">
                {emails.map((email, i) => (
                  <div key={i} className="email-chip">
                    <span>{email}</span>
                    <X size={14} onClick={() => setEmails(emails.filter((_, idx) => idx !== i))} className="remove-chip-icon" />
                  </div>
                ))}
                <input
                  autoFocus
                  className="chip-input"
                  placeholder={emails.length === 0 ? 'Add email...' : ''}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => inputValue && addEmailPublic(inputValue)}
                />
              </div>
            </div>
            <div className="input-group">
              <label><Clock size={14} /> Expires in (hours)</label>
              <input type="number" className="modal-input" value={expiresInHours} min={1} max={720}
                onChange={(e) => setExpiresInHours(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Message</label>
              <textarea className="modal-textarea" placeholder="Add a message..." value={message}
                onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button type="button" className="cancel-btn" onClick={handleClose}>Cancel</button>
              <button type="submit" className="share-submit-btn" disabled={loading}>
                {loading ? <><Loader2 size={16} className="spinner" /> Sending...</> : `Share (${emails.length})`}
              </button>
            </div>
          </form>
        )}

        {/* ── PRIVATE FORM ── */}
        {mode === 'private' && (
          <form onSubmit={handlePrivateSubmit} className="modal-form">
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
                  onBlur={() => inputValue && addEmailPrivate(inputValue)}
                />
              </div>
            </div>

            <div className="ps-form-group">
              <label>Permissions</label>
              <div className="ps-perms-grid">
                {PERMS.map((p) => {
                  const disabled = parentShare && !parentShare[p.key];
                  return (
                    <label key={p.key} className={`ps-perm-label ${disabled ? 'disabled-label' : ''}`}>
                      <input type="checkbox" checked={defaultPerms[p.key]}
                        disabled={disabled || p.key === 'can_view'}
                        onChange={(e) => setDefaultPerms({ ...defaultPerms, [p.key]: e.target.checked })} />
                      <span>{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="ps-toggle-row">
              <label className="ps-toggle-label"><Lock size={14} /> Password protect</label>
              <button type="button" className={`ps-switch ${enablePassword ? 'on' : ''}`}
                onClick={() => { setEnablePassword(v => { if (v) setPassword(''); return !v; }); }}>
                <span className="ps-switch-thumb" />
              </button>
            </div>
            {enablePassword && (
              <div className="input-group">
                <label>Password</label>
                <div className="ps-password-wrap">
                  <input type={showPassword ? 'text' : 'password'} className="modal-input"
                    value={password} placeholder="••••••••"
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password" name="private-share-password" />
                  <button type="button" className="ps-password-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <div className="ps-toggle-row">
              <label className="ps-toggle-label">
                <input type="checkbox" checked={oneTime} style={{ marginRight: '6px' }}
                  onChange={(e) => setOneTime(e.target.checked)} />
                One-time access
              </label>
              <span className="ps-field-hint">Expires after first download</span>
            </div>

            {!oneTime && (
              <div className="input-group">
                <label><Clock size={14} /> Expires in (hours)</label>
                <input type="number" className="modal-input" value={privateExpiresInHours}
                  min={1} max={720} onChange={(e) => setPrivateExpiresInHours(e.target.value)} />
              </div>
            )}

            {!oneTime && (
              <div className="input-group">
                <label><DownloadCloud size={14} /> Max downloads (blank = unlimited)</label>
                <input type="number" className="modal-input" value={maxDownloads} min={1}
                  placeholder="e.g. 5" onChange={(e) => setMaxDownloads(e.target.value)} />
              </div>
            )}

            <div className="ps-toggle-row">
              <label className="ps-toggle-label"><CalendarClock size={14} /> Restrict to time window</label>
              <button type="button" className={`ps-switch ${enableTimeWindow ? 'on' : ''}`}
                onClick={() => setEnableTimeWindow(v => !v)}>
                <span className="ps-switch-thumb" />
              </button>
            </div>
            {enableTimeWindow && (
              <div className="ps-time-window-panel">
                <div className="ps-weekday-row">
                  {WEEKDAYS.map(({ v, l }) => (
                    <button key={v} type="button"
                      className={`ps-day-btn ${windowDays.includes(v) ? 'active' : ''}`}
                      onClick={() => setWindowDays(prev =>
                        prev.includes(v) ? prev.filter(d => d !== v) : [...prev, v].sort()
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
                <div className="ps-time-inputs">
                  <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>From</label>
                    <input type="time" className="modal-input" value={windowStart}
                      onChange={(e) => setWindowStart(e.target.value)} />
                  </div>
                  <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Until</label>
                    <input type="time" className="modal-input" value={windowEnd}
                      onChange={(e) => setWindowEnd(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className="input-group">
              <label>Message</label>
              <textarea className="modal-textarea" value={message}
                onChange={(e) => setMessage(e.target.value)} placeholder="Optional message..." />
            </div>

            <div className="modal-footer">
              <button type="button" className="cancel-btn" onClick={handleClose}>Cancel</button>
              <button type="submit" className="share-submit-btn" disabled={loading || !!successInfo}>
                {loading ? <><Loader2 size={16} className="spinner" /> Sharing...</> : `Share with ${emails.length} user(s)`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}