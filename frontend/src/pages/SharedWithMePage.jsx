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
  const [reshareShare, setReshareShare] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 9;
  const [openMenu, setOpenMenu] = useState(null);
  const [filters, setFilters] = useState({});  // ✅ empty object
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
      const { data } = await fetchPrivateSharesInboxApi(page, pageSize);
  
      let list =
        data.results?.shares ??
        data.shares ??
        (Array.isArray(data.results) ? data.results : []);
  
      // collect senders before filtering
      const uniqueSenders = [...new Set(list.map(s => s.shared_by_email).filter(Boolean))];
      setSenders(uniqueSenders);
  
      // Type filter — based on file_name extension
      if (currentFilters.type) {
        list = list.filter(s => {
          const ext = (s.file_name || '').split('.').pop().toLowerCase();
          if (currentFilters.type === 'image') return ['jpg','jpeg','png','gif','svg','webp','bmp'].includes(ext);
          if (currentFilters.type === 'pdf') return ext === 'pdf';
          if (currentFilters.type === 'document') return ['doc','docx','xls','xlsx','txt','csv','ppt','pptx'].includes(ext);
          if (currentFilters.type === 'other') return !['jpg','jpeg','png','gif','svg','webp','bmp','pdf','doc','docx','xls','xlsx','txt','csv','ppt','pptx'].includes(ext);
          return true;
        });
      }
  
      // People filter
      if (currentFilters.sharedBy) {
        list = list.filter(s => s.shared_by_email === currentFilters.sharedBy);
      }
  
     
      // Expires filter
if (currentFilters.expires) {
  const now = new Date();
  list = list.filter(s => {
    const exp = s.expires_at ? new Date(s.expires_at) : null;
    if (currentFilters.expires === 'never') return !exp;
    if (currentFilters.expires === 'past') return exp && exp < now;
    if (currentFilters.expires === 'week') return exp && exp >= now && exp <= new Date(Date.now() + 7 * 86400000);
    if (currentFilters.expires === 'month') return exp && exp >= now && exp <= new Date(Date.now() + 30 * 86400000);
    return true;
  });
}
      // Status filter
      if (currentFilters.status) {
        list = list.filter(s => {
          const st = (s.access_status || '').toLowerCase().replace(/\.$/, '').trim();
          return st === currentFilters.status.toLowerCase();
        });
      }
  
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
      delete newFilters[key]; // ✅ deselect
    } else {
      newFilters[key] = value;
    }

    console.log("new filters:", newFilters);
    setFilters(newFilters);
    setCurrentPage(1);
    load(1, newFilters);
    setOpenFilter(null);
  };

  const clearFilters = () => {
    setFilters({});       // ✅ empty object
    setCurrentPage(1);
    load(1, {});          // ✅ reload with no filters
  };

  const activeFilterCount = Object.keys(filters).length; // ✅ correct count

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
      const isPDF = extension === 'pdf';
      setPreviewFile({ ...share, url, isImage, isPDF });
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = share.file_name;
      link.click();
      window.URL.revokeObjectURL(url);
    }
    load();
    return true;
  };

  const handleDownload = async (share, pwd = '', silent = false) => {
    try {
      await runProtectedAction(share, pwd, 'download');
      if (!silent) showToast('Download started');
    } catch (err) {
      const msg = await parseApiError(err, 'Download failed.');
      if (err.response?.status === 403) {
        if (share.requires_password || msg.toLowerCase().includes('password')) {
          setPasswordError(msg);
          setPasswordPrompt({ share, action: 'download' });
          return;
        }
      }
      if (!silent) setAlertModal({ title: 'Download failed', message: msg, variant: 'error' });
      throw err;
    }
  };

  const handlePreview = async (share, pwd = '', silent = false) => {
    try {
      await runProtectedAction(share, pwd, 'preview');
    } catch (err) {
      const msg = await parseApiError(err, 'Preview failed.');
      if (err.response?.status === 403) {
        if (share.requires_password || msg.toLowerCase().includes('password')) {
          setPasswordError(msg);
          setPasswordPrompt({ share, action: 'preview' });
          return;
        }
      }
      if (!silent) setAlertModal({ title: 'Preview failed', message: msg, variant: 'error' });
      throw err;
    }
  };

  const submitPassword = async () => {
    if (!password.trim()) { setPasswordError('Please enter the password.'); return; }
    setPasswordSubmitting(true);
    setPasswordError('');
    let success = false;
    try {
      const { share, action } = passwordPrompt;
      if (action === 'download') await handleDownload(share, password, true);
      else await handlePreview(share, password, true);
      success = true;
      setPasswordPrompt(null);
      setPassword('');
      setShowPassword(false);
    } catch (err) {
      const msg = await parseApiError(err, 'Invalid password.');
      showToast('Invalid Password');
      setPasswordError(msg);
    } finally {
      setPasswordSubmitting(false);
      if (success) {
        const { action } = passwordPrompt;
        showToast(action === 'download' ? 'Download started' : 'Preview opened');
      }
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
                      {s.access_status === 'accessible' ? (
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
                              {s.can_view && (
                                <button className="ps-drop-item" onClick={() => {
                                  setOpenMenu(null);
                                  s.requires_password
                                    ? setPasswordPrompt({ share: s, action: 'preview' })
                                    : handlePreview(s);
                                }}>
                                  <Eye size={14} /> Preview
                                  <span className="ps-drop-views">{s.view_count ?? 0}</span>
                                </button>
                              )}
                              {s.can_download && (
                                <button className="ps-drop-item" onClick={() => {
                                  setOpenMenu(null);
                                  s.requires_password
                                    ? setPasswordPrompt({ share: s, action: 'download' })
                                    : handleDownload(s);
                                }}>
                                  <Download size={14} /> Download
                                  {s.requires_password && <Lock size={12} className="ps-drop-lock" />}
                                </button>
                              )}
                              {s.can_reshare && (
                                <button className="ps-drop-item" onClick={() => {
                                  setOpenMenu(null); setReshareShare(s);
                                }}>
                                  <Share2 size={14} /> Re-share
                                </button>
                              )}
                              {s.can_comment && (
                                <button className="ps-drop-item" onClick={() => {
                                  setOpenMenu(null); openComments(s.share_id);
                                }}>
                                  <MessageSquare size={14} /> Comments
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="ps-muted"></span>
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
          onClick={() => { URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}
        >
          <div className="ps-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ps-preview-header">
              <h3>Preview: {previewFile.file_name}</h3>
              <button
                type="button"
                className="close-x-btn"
                onClick={() => { URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="ps-preview-container">
              {previewFile.isImage ? (
                <img src={previewFile.url} alt="Preview" className="ps-preview-image" />
              ) : previewFile.isPDF ? (
                <iframe
                  src={`${previewFile.url}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="ps-preview-pdf"
                  title="PDF Preview"
                />
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