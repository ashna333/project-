import React, { useEffect, useState } from 'react';
import { Inbox, Download, Eye, EyeOff, Lock, MessageSquare, X, Share2, MoreVertical, ChevronDown, File as FileIcon, User as UserIcon, Calendar as CalendarIcon, Activity as ActivityIcon } from 'lucide-react';
import {
  fetchPrivateSharesInboxApi,
  downloadPrivateShareApi,
  fetchPrivateShareCommentsApi,
  postPrivateShareCommentApi,
} from '../store/fileApi';
import PrivateShareModal from '../components/ShareModal';
import { useToast } from '../components/ToastContext';
import Pagination from '../components/Pagination';
import AlertModal from '../components/AlertModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { parseApiError } from '../utils/parseApiError';
import '../styles/PrivateSharePages.css';

function formatStatus(s) {
  const status = (s.access_status || '').toLowerCase().replace(/\.$/, '').trim();
  if (status === 'accessible') return { label: 'Accessible', className: 'active' };
  if (status === 'expired') return { label: 'Expired', className: 'inactive' };
  if (status === 'revoked') return { label: 'Revoked', className: 'inactive' };
  if (status === 'one time access') return { label: 'One-time used', className: 'inactive' };
  if (!status) return { label: 'Unknown', className: 'inactive' };
  return { label: s.access_status.replace(/\.$/, ''), className: 'inactive' };
}

export default function SharedWithMePage() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwordPrompt, setPasswordPrompt] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reshareShare, setReshareShare] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 9;
  const [openMenu, setOpenMenu] = useState(null);
  const [filters, setFilters] = useState({});
  const [openFilter, setOpenFilter] = useState(null);
  const [senders, setSenders] = useState([]);

  useEffect(() => {
    const close = () => { setOpenMenu(null); setOpenFilter(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const anyModalOpen =
    !!passwordPrompt || !!commentsOpen || !!previewFile || !!reshareShare || !!alertModal;
  useBodyScrollLock(anyModalOpen);

  const load = async (page = 1, currentFilters = filters) => {
  setLoading(true);
  try {
    // Pass filters directly to the API instead of filtering client-side
    const { data } = await fetchPrivateSharesInboxApi(page, pageSize, currentFilters);

    let list =
      data.results?.shares ??
      data.shares ??
      (Array.isArray(data.results) ? data.results : []);

    // Collect senders from this page for the People filter dropdown
    // (ideally you'd fetch all senders separately, but this works for now)
    const uniqueSenders = [...new Set(list.map(s => s.shared_by_email).filter(Boolean))];
    setSenders(prev => [...new Set([...prev, ...uniqueSenders])]);

    setTotalPages(Math.ceil((data.count || 0) / pageSize) || 1);
    setShares(list);

    localStorage.setItem('inbox_last_seen', new Date().toISOString());
    window.dispatchEvent(new Event('inbox-seen'));
  } catch (err) {
    console.error('load error:', err);
    setShares([]);
  } finally {
    setLoading(false);
  }
};

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters };
    if (newFilters[key] === value) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
    setCurrentPage(1);
    load(1, newFilters);
    setOpenFilter(null);
  };

  const clearFilters = () => {
    setFilters({});
    setSenders([]);
    setCurrentPage(1);
    load(1, {});
  };

  const activeFilterCount = Object.keys(filters).length;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    load(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => { load(1); }, []);

  const filterConfig = [
    {
      key: 'type',
      label: 'Type',
      icon: <FileIcon size={13} />,
      options: [
        { value: 'image', label: 'Images' },
        { value: 'pdf', label: 'PDF' },
        { value: 'document', label: 'Documents' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      key: 'sharedBy',
      label: 'People',
      icon: <UserIcon size={13} />,
      options: senders.map(e => ({ value: e, label: e })),
    },
    {
      key: 'expires',
      label: 'Expires',
      icon: <CalendarIcon size={13} />,
      options: [
        { value: 'never', label: 'No expiry' },
        { value: 'past', label: 'Already expired' },
        { value: 'week', label: 'Within 7 days' },
        { value: 'month', label: 'Within 30 days' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      icon: <ActivityIcon size={13} />,
      options: [
        { value: 'accessible', label: 'Accessible' },
        { value: 'expired', label: 'Expired' },
        { value: 'revoked', label: 'Revoked' },
      ],
    },
  ];

  const runProtectedAction = async (share, pwd, action) => {
    const isPreview = action === 'preview';
    const { data } = await downloadPrivateShareApi(share.share_id, pwd, isPreview);
    const url = window.URL.createObjectURL(
      new Blob([data], { type: data.type || 'application/octet-stream' })
    );
    if (isPreview) {
      const extension = share.file_name.split('.').pop().toLowerCase();
      const isImage = ['jpg','jpeg','png','gif','svg','webp','bmp'].includes(extension);
      const isPDF   = extension === 'pdf';
      const isVideo = ['mp4','webm','mov','avi','mkv'].includes(extension);
      const isAudio = ['mp3','wav','ogg','aac','flac','m4a'].includes(extension);
      setPreviewFile({ ...share, url, isImage, isPDF, isVideo, isAudio });
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = share.file_name;
      link.click();
      window.URL.revokeObjectURL(url);
    }
    return true;
  };

  const handleDownload = async (share, pwd = '', silent = false) => {
    try {
      await runProtectedAction(share, pwd, 'download');
      load();
      if (!silent) showToast('Download started');
    } catch (err) {
      if (silent) throw err; // let submitPassword handle it
      const msg = await parseApiError(err, 'Download failed.');
      if (err.response?.status === 403 &&
          (share.requires_password || msg.toLowerCase().includes('password'))) {
        setPasswordError(msg);
        setPasswordPrompt({ share, action: 'download' });
        return;
      }
      setAlertModal({ title: 'Download failed', message: msg, variant: 'error' });
    }
  };

  const handlePreview = async (share, pwd = '', silent = false) => {
    try {
      const extension = share.file_name.split('.').pop().toLowerCase();
      const isImage = ['jpg','jpeg','png','gif','svg','webp','bmp'].includes(extension);
      const isPDF   = extension === 'pdf';
      const isVideo = ['mp4','webm','mov','avi','mkv'].includes(extension);
      const isAudio = ['mp3','wav','ogg','aac','flac','m4a'].includes(extension);
      setPreviewLoading(true);
      setPreviewFile({ ...share, url: null, isImage, isPDF, isVideo, isAudio });
      await runProtectedAction(share, pwd, 'preview');
      load();
    } catch (err) {
      if (silent) throw err; // let submitPassword handle it
      const msg = await parseApiError(err, 'Preview failed.');
      const isPasswordError = err.response?.status === 403 &&
        (share.requires_password || msg.toLowerCase().includes('password')) &&
        !msg.toLowerCase().includes('download limit');
      if (isPasswordError) {
        setPasswordError(msg);
        setPasswordPrompt({ share, action: 'preview' });
        return;
      }
      setAlertModal({ title: 'Preview failed', message: msg, variant: 'error' });
      setPreviewFile(null);
    }
    finally {
      setPreviewLoading(false);
    }
  };

  const submitPassword = async () => {
    if (!password.trim()) { setPasswordError('Please enter the password.'); return; }
    setPasswordSubmitting(true);
    setPasswordError('');
    const { share, action } = passwordPrompt; // capture before any state change
    try {
      if (action === 'download') await handleDownload(share, password, true);
      else await handlePreview(share, password, true);
      // success — close modal then toast
      setPasswordPrompt(null);
      setPassword('');
      setShowPassword(false);
      showToast(action === 'download' ? 'Download started' : 'Preview opened');
    } catch (err) {
      const msg = await parseApiError(err, 'Invalid password.');
      setPasswordError(msg);
      // modal stays open, no success toast
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

  const openComments = async (shareId) => {
    setCommentsOpen(shareId);
    const { data } = await fetchPrivateShareCommentsApi(shareId);
    setComments(data);
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    await postPrivateShareCommentApi(commentsOpen, { content: newComment });
    setNewComment('');
    setCommentsOpen(null);
    showToast('Comment posted');
  };

  return (
    <div className="private-share-page fade-in">
      <div className="ps-header">
        <Inbox size={28} className="rose-text" />
        <div>
          <h1>Shared With Me</h1>
          <p>Files privately shared with your account</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="ps-filter-bar" onClick={(e) => e.stopPropagation()}>
        {filterConfig.map(({ key, label, options }) => (
          <div key={key} className="ps-filter-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              className={`ps-filter-btn ${filters[key] ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(openFilter === key ? null : key);
              }}
            >
              {label}
              {filters[key] && (
                <span className="ps-filter-active-val">
                  : {options.find(o => o.value === filters[key])?.label}
                </span>
              )}
              <ChevronDown size={12} />
            </button>

            {openFilter === key && (
              <div className="ps-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                {options.map(opt => (
                  <button
                    key={opt.value}
                    className={`ps-filter-option ${filters[key] === opt.value ? 'active' : ''}`}
                    onClick={() => handleFilterChange(key, opt.value)}
                  >
                    {filters[key] === opt.value && (
                      <span style={{ color: '#e11d48', marginRight: '4px' }}>✓</span>
                    )}
                    {opt.label}
                  </button>
                ))}
                {filters[key] && (
                  <button
                    className="ps-filter-clear-one"
                    onClick={() => handleFilterChange(key, filters[key])}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {activeFilterCount > 0 && (
          <button className="ps-filter-reset" onClick={clearFilters}>
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      {loading ? (
        <p className="ps-muted">Loading...</p>
      ) : shares.length === 0 ? (
        <div className="ps-empty">
          {activeFilterCount > 0 ? 'No shares match your filters.' : 'No private shares in your inbox yet.'}
        </div>
      ) : (
        <div className="ps-table-wrap">
          <table className="ps-table">
            <colgroup>
              <col className="ps-col-file" />
              <col className="ps-col-shared" />
              <col className="ps-col-perms" />
              <col className="ps-col-expires" />
              <col className="ps-col-status" />
              <col className="ps-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th className="ps-col-file">File</th>
                <th className="ps-col-shared">Shared by</th>
                <th className="ps-col-perms">Permissions</th>
                <th className="ps-col-expires">Expires</th>
                <th className="ps-col-status">Status</th>
                <th className="ps-col-actions" style={{ width: '44px' }}></th>
              </tr>
            </thead>
            <tbody>
              {shares.map((s) => {
                const statusInfo = formatStatus(s);
                const status = (s.access_status || '').toLowerCase().replace(/\.$/, '').trim();
                const isRevoked = status === 'revoked';
                const isExpired = status === 'expired';
                const downloadLimitReached =
                  status === 'download limit reached' || s.download_limit_reached === true;

                const hasView     = s.can_view;
                const hasDownload = s.can_download;
                const hasReshare  = s.can_reshare;
                const hasComment  = s.can_comment;
                const hasAnyAction = hasView || (hasDownload && !downloadLimitReached) || hasReshare || hasComment;

                return (
                  <tr key={s.id}>
                    <td className="ps-col-file">
                      <strong className="ps-file-name">{s.file_name}</strong>
                      {s.message && <div className="ps-file-note">Note: {s.message}</div>}
                    </td>
                    <td className="ps-col-shared">
                      <span className="ps-shared-name">{s.shared_by}</span>
                      <span className="ps-muted ps-shared-email" title={s.shared_by_email}>
                        {s.shared_by_email}
                      </span>
                    </td>
                    <td className="ps-col-perms">
                      <div className="perm-badges">
                        {s.can_view && <span>View</span>}
                        {s.can_download && <span>Download</span>}
                        {s.can_reshare && <span>Re-share</span>}
                        {s.can_comment && <span>Comment</span>}
                      </div>
                    </td>
                    <td className="ps-col-expires ps-expires-cell">
                      {s.one_time_access
                        ? <span className="one-time-badge">One-time</span>
                        : s.expires_at
                          ? new Date(s.expires_at).toLocaleString()
                          : '—'
                      }
                    </td>
                    <td className="ps-col-status">
                      <span
                        className={`status-pill ${statusInfo.className}`}
                        title={statusInfo.title || statusInfo.label}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="ps-col-actions" style={{ position: 'relative' }}>
                      {/* Hide all actions for revoked or expired */}
                      {isRevoked || isExpired ? (
                        <span className="ps-muted"></span>
                      ) : (
                        /* Show menu if there is at least one action available,
                           OR if download limit is reached but other actions exist */
                        (hasView || hasDownload || hasReshare || hasComment) && (
                          <div className="ps-dot-wrap">
                            <button
                              className="ps-dot-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenu(openMenu === s.id ? null : s.id);
                              }}
                              aria-label="Actions"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {openMenu === s.id && (
                              <div className="ps-dropdown">
                                {hasView && (
                                  <button className="ps-drop-item" onClick={() => {
                                    setOpenMenu(null);
                                    // If download limit is reached, skip password prompt — just preview directly
                                    // (preview is still allowed; only download is blocked)
                                    if (!downloadLimitReached && s.requires_password) {
                                      setPasswordPrompt({ share: s, action: 'preview' });
                                    } else {
                                      handlePreview(s);
                                    }
                                  }}>
                                    <Eye size={14} /> Preview
                                    <span className="ps-drop-views">{s.view_count ?? 0}</span>
                                  </button>
                                )}
                                {hasDownload && (
                                  <button
                                    className={`ps-drop-item${downloadLimitReached ? ' ps-drop-item--disabled' : ''}`}
                                    disabled={downloadLimitReached}
                                    title={downloadLimitReached ? 'Download limit reached' : undefined}
                                    onClick={() => {
                                      if (downloadLimitReached) return;
                                      setOpenMenu(null);
                                      s.requires_password
                                        ? setPasswordPrompt({ share: s, action: 'download' })
                                        : handleDownload(s);
                                    }}
                                  >
                                    <Download size={14} /> Download
                                    {downloadLimitReached
                                      ? <span className="ps-drop-limit">Limit reached</span>
                                      : s.requires_password && <Lock size={12} className="ps-drop-lock" />
                                    }
                                  </button>
                                )}
                                {hasReshare && (
                                  <button className="ps-drop-item" onClick={() => {
                                    setOpenMenu(null); setReshareShare(s);
                                  }}>
                                    <Share2 size={14} /> Re-share
                                  </button>
                                )}
                                {hasComment && (
                                  <button className="ps-drop-item" onClick={() => {
                                    setOpenMenu(null); openComments(s.share_id);
                                  }}>
                                    <MessageSquare size={14} /> Comments
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        loading={loading}
      />

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
                name="private-share-access-password"
                onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
              />
              <button
                type="button"
                className="ps-password-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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

      {commentsOpen && (
        <div className="modal-overlay" onClick={() => setCommentsOpen(null)}>
          <div className="ps-comments-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Comments</h3>
            <div className="comments-list">
              {comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <strong>{c.author_name}</strong>
                  <p>{c.content}</p>
                  {c.highlight_text && <em>Highlight: {c.highlight_text}</em>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                className="modal-textarea"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
              />
              <button
                type="button"
                className="share-submit-btn"
                onClick={submitComment}
                style={{ alignSelf: 'flex-end' }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

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
              ) : previewFile.isImage ? (
                <img src={previewFile.url} alt="Preview" className="ps-preview-image" />
              ) : previewFile.isPDF ? (
                <iframe
                  src={`${previewFile.url}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="ps-preview-pdf"
                  title="PDF Preview"
                />
              ) : previewFile.isVideo ? (
                <video
                  src={previewFile.url}
                  controls
                  autoPlay
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    background: '#000',
                    borderRadius: '0 0 12px 12px',
                    display: 'block',
                  }}
                />
              ) : previewFile.isAudio ? (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '24px', height: '100%', padding: '40px',
                }}>
                  <div style={{ opacity: 0.2 }}>
                    <FileIcon size={64} color="#e11d48" />
                  </div>
                  <audio
                    src={previewFile.url}
                    controls
                    autoPlay
                    style={{ width: '85%', accentColor: '#e11d48' }}
                  />
                  <p style={{ color: '#71717a', fontSize: '13px' }}>{previewFile.file_name}</p>
                </div>
              ) : (
                <div className="ps-preview-unavailable">
                  Preview not available for this file type. Please download to view.
                </div>
              )}
</div>
          </div>
        </div>
      )}

      {reshareShare && (
        <PrivateShareModal
          file={{ id: reshareShare.file_id, original_name: reshareShare.file_name }}
          parentShare={reshareShare}
          isOpen={true}
          onClose={() => setReshareShare(null)}
          onSuccess={() => { load(); showToast('File re-shared successfully'); }}
        />
      )}

      <AlertModal
        open={!!alertModal}
        title={alertModal?.title}
        message={alertModal?.message}
        variant={alertModal?.variant}
        onClose={() => setAlertModal(null)}
      />
    </div>
  );
}