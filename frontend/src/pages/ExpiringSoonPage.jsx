import React, { useEffect, useState } from 'react';
import { Clock, Lock, AlertTriangle, Download, Eye, EyeOff, MessageSquare, X } from 'lucide-react';
import { fetchExpiringSoonDetailApi, downloadPrivateShareApi } from '../store/fileApi';
import { useToast } from '../components/ToastContext';
import AlertModal from '../components/AlertModal';
import FilePreview from '../components/FilePreview';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { parseApiError } from '../utils/parseApiError';
import '../styles/DashboardPage.css';

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 1000 / 60 / 60);
  const m = Math.floor((diff / 1000 / 60) % 60);
  if (h === 0) return `${m}m left`;
  return `${h}h ${m}m left`;
}

function urgencyColor(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  const hours = diff / 1000 / 60 / 60;
  if (hours <= 2) return '#e11d48';
  if (hours <= 6) return '#f97316';
  return '#eab308';
}

function PrivateShareCard({ share, onPreview, onDownload }) {
  const color = urgencyColor(share.expires_at);

  return (
    <div style={{
      background: '#18181b',
      border: '1px solid #27272a',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      borderLeft: `3px solid ${color}`,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={13} color="#a1a1aa" />
            <p style={{
              color: '#f4f4f5', fontWeight: 500, fontSize: '14px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              margin: 0,
            }}>
              {share.file_name}
            </p>
          </div>
          <p style={{ color: '#71717a', fontSize: '12px', margin: '4px 0 0' }}>
            Shared by {share.shared_by}
          </p>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 600, color,
          background: `${color}18`,
          border: `1px solid ${color}44`,
          borderRadius: '999px',
          padding: '3px 10px',
          whiteSpace: 'nowrap',
          marginLeft: '12px',
          flexShrink: 0,
        }}>
          {timeLeft(share.expires_at)}
        </span>
      </div>

      {/* Extra badges row */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {share.one_time_access && (
          <span style={{
            fontSize: '11px', color: '#a78bfa',
            background: '#a78bfa18', border: '1px solid #a78bfa44',
            borderRadius: '999px', padding: '2px 8px',
          }}>
            One-time
          </span>
        )}
        {share.requires_password && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', color: '#a1a1aa',
            background: '#27272a', border: '1px solid #3f3f46',
            borderRadius: '999px', padding: '2px 8px',
          }}>
            <Lock size={10} /> Password
          </span>
        )}
        {share.can_comment && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', color: '#a1a1aa',
            background: '#27272a', borderRadius: '999px', padding: '2px 8px',
          }}>
            <MessageSquare size={10} /> Comment
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {share.can_view && (
          <button
            onClick={() => onPreview(share)}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              fontSize: '12px', fontWeight: 500,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#d4d4d8',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#d4d4d8'; }}
          >
            <Eye size={13} /> View
          </button>
        )}
        {share.can_download && (
          <button
            onClick={() => onDownload(share)}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              fontSize: '12px', fontWeight: 500,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#d4d4d8',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225,29,72,0.15)'; e.currentTarget.style.color = '#fda4af'; e.currentTarget.style.borderColor = 'rgba(225,29,72,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#d4d4d8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
          >
            <Download size={13} /> Download
          </button>
        )}
      </div>

      <p style={{ color: '#52525b', fontSize: '11px', margin: 0 }}>
        Expires {new Date(share.expires_at).toLocaleString()}
      </p>
    </div>
  );
}

export default function ExpiringSoonPage() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Password prompt state
  const [passwordPrompt, setPasswordPrompt] = useState(null); // { share, action }
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Preview state
  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Alert modal
  const [alertModal, setAlertModal] = useState(null);

  const anyModalOpen = !!passwordPrompt || !!previewFile || !!alertModal;
  useBodyScrollLock(anyModalOpen);

  const reload = () => {
    fetchExpiringSoonDetailApi()
      .then(({ data }) => setShares(data.private || []))
      .catch(() => showToast('Failed to reload shares.', 'error'));
  };

useEffect(() => {
  setLoading(true);
  fetchExpiringSoonDetailApi()
    .then(({ data }) => {
      console.log('expiring shares sample:', data.private?.[0]);
      setShares(data.private || []);
    })
    .catch(() => showToast('Failed to load expiring shares.', 'error'))
    .finally(() => setLoading(false));
}, []);

  const runProtectedAction = async (share, pwd, action) => {
    const isPreview = action === 'preview';
    const { data } = await downloadPrivateShareApi(share.grant_id, pwd, isPreview);
    const url = window.URL.createObjectURL(
      new Blob([data], { type: data.type || 'application/octet-stream' })
    );
    if (isPreview) {
      setPreviewFile({ ...share, url, original_name: share.file_name });
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = share.file_name;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const handleDownload = async (share, pwd = '', silent = false) => {
    try {
      await runProtectedAction(share, pwd, 'download');
      reload();
      if (!silent) showToast('Download started');
    } catch (err) {
      if (silent) throw err;
      const msg = await parseApiError(err, 'Download failed.');
      if (err.response?.status === 403 &&
          (share.requires_password || msg.toLowerCase().includes('password'))) {
        setPasswordError('');
        setPasswordPrompt({ share, action: 'download' });
        return;
      }
      setAlertModal({ title: 'Download failed', message: msg, variant: 'error' });
    }
  };

  const handlePreview = async (share, pwd = '', silent = false) => {
    try {
      setPreviewLoading(true);
      setPreviewFile({ ...share, url: null, original_name: share.file_name });
      await runProtectedAction(share, pwd, 'preview');
      reload();
    } catch (err) {
      if (silent) throw err;
      const msg = await parseApiError(err, 'Preview failed.');
      const isPasswordError = err.response?.status === 403 &&
        (share.requires_password || msg.toLowerCase().includes('password')) &&
        !msg.toLowerCase().includes('download limit');
      if (isPasswordError) {
        setPasswordError('');
        setPasswordPrompt({ share, action: 'preview' });
        setPreviewFile(null);
        return;
      }
      setAlertModal({ title: 'Preview failed', message: msg, variant: 'error' });
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const submitPassword = async () => {
    if (!password.trim()) { setPasswordError('Please enter the password.'); return; }
    setPasswordSubmitting(true);
    setPasswordError('');
    const { share, action } = passwordPrompt;
    try {
      if (action === 'download') await handleDownload(share, password, true);
      else await handlePreview(share, password, true);
      setPasswordPrompt(null);
      setPassword('');
      setShowPassword(false);
      showToast(action === 'download' ? 'Download started' : 'Preview opened');
    } catch (err) {
      const msg = await parseApiError(err, 'Invalid password.');
      setPasswordError(msg);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const closePasswordModal = () => {
    setPasswordPrompt(null);
    setPassword('');
    setPasswordError('');
    setShowPassword(false);
  };

  return (
    <main className="dashboard-main fade-in">
      <div className="file-manager-header">
        <div className="welcome-sectionfm">
          <div className="welcome-labelfm">Alerts</div>
          <h1 className="welcome-titlefm">Expiring Soon</h1>
          <p style={{ color: '#71717a' }}>
            Files shared with you that expire within 24 hours
          </p>
        </div>
      </div>

      {loading ? (
        <div className="fm-empty-state"><div className="fm-spinner" /></div>
      ) : shares.length === 0 ? (
        <div className="fm-empty-state" style={{ paddingTop: '60px' }}>
          <Clock size={60} color="#27272a" strokeWidth={1} />
          <h2 style={{ marginTop: '20px', color: 'white' }}>Nothing expiring soon</h2>
          <p style={{ color: '#71717a', marginTop: '8px' }}>
            All files shared with you have more than 24 hours remaining.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={15} color="#e11d48" />
            <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>
              {shares.length} file{shares.length !== 1 ? 's' : ''} expiring within 24 hours — download or preview before losing access.
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {shares.map(s => (
              <PrivateShareCard
                key={s.id}
                share={s}
                onPreview={handlePreview}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </>
      )}

      {/* Password modal */}
      {passwordPrompt && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="ps-password-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Enter share password</h3>
            <p className="ps-muted" style={{ marginBottom: '12px', fontSize: '13px' }}>
              This file is password protected.
            </p>
            <div className="ps-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                className="modal-input"
                placeholder="••••••••"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
                autoFocus
              />
              <button
                type="button"
                className="ps-password-eye"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {passwordError && <div className="ps-password-error">{passwordError}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="button" className="cancel-btn" style={{ flex: 1 }} onClick={closePasswordModal}>
                Cancel
              </button>
              <button
                type="button"
                className="share-submit-btn"
                style={{ flex: 1 }}
                disabled={passwordSubmitting}
                onClick={submitPassword}
              >
                {passwordSubmitting ? 'Checking...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewFile && (
        <div
          className="modal-overlay"
          onClick={() => { if (previewFile.url) URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}
        >
          <div className="ps-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ps-preview-header">
              <h3>Preview: {previewFile.file_name}</h3>
              <button
                type="button"
                className="close-x-btn"
                onClick={() => { if (previewFile.url) URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="ps-preview-container">
              {previewLoading || !previewFile.url ? (
                <div className="ps-preview-unavailable">Loading preview…</div>
              ) : (
                <FilePreview file={previewFile} />
              )}
            </div>
          </div>
        </div>
      )}

      <AlertModal
        open={!!alertModal}
        title={alertModal?.title}
        message={alertModal?.message}
        variant={alertModal?.variant}
        onClose={() => setAlertModal(null)}
      />
    </main>
  );
}