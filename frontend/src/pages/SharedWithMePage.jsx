import React, { useEffect, useState } from 'react';
import { Inbox, Download, Eye, EyeOff, Lock, MessageSquare, X, Share2 } from 'lucide-react';
import {
  fetchPrivateSharesInboxApi,
  downloadPrivateShareApi,
  fetchPrivateShareCommentsApi,
  postPrivateShareCommentApi,
} from '../store/fileApi';
import PrivateShareModal from '../components/PrivateShareModal';
import '../styles/PrivateSharePages.css';

export default function SharedWithMePage() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwordPrompt, setPasswordPrompt] = useState(null); // { share, action: 'download' | 'preview' }
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [reshareShare, setReshareShare] = useState(null);
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await fetchPrivateSharesInboxApi();
      const list = data.results?.shares ?? data.shares ?? (Array.isArray(data.results) ? data.results : []);
      setShares(list);
    } catch {
      setShares([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDownload = async (share, pwd = '') => {
    try {
      const { data } = await downloadPrivateShareApi(share.share_id, pwd);
      const url = window.URL.createObjectURL(new Blob([data], { type: data.type || 'application/octet-stream' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = share.file_name;
      link.click();
      window.URL.revokeObjectURL(url);
      load();
    } catch (err) {
      if (err.response?.status === 403 && share.requires_password) {
        setPasswordPrompt({ share, action: 'download' });
      } else {
        alert(err.response?.data?.error || 'Download failed.');
      }
    }
  };

  const handlePreview = async (share, pwd = '') => {
    try {
      const { data } = await downloadPrivateShareApi(share.share_id, pwd, true);
      const url = window.URL.createObjectURL(new Blob([data], { type: data.type || 'application/octet-stream' }));
      
      const extension = share.file_name.split('.').pop().toLowerCase();
      const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension);
      const isPDF = extension === "pdf";

      setPreviewFile({ ...share, url, isImage, isPDF });
      load();
    } catch (err) {
      if (err.response?.status === 403 && share.requires_password) {
        setPasswordPrompt({ share, action: 'preview' });
      } else {
        alert(err.response?.data?.error || 'Preview failed.');
      }
    }
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

      {loading ? (
        <p className="ps-muted">Loading...</p>
      ) : shares.length === 0 ? (
        <div className="ps-empty">No private shares in your inbox yet.</div>
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
                <th className="ps-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shares.map((s) => (
                <tr key={s.id}>
                  <td className="ps-col-file">
                    <strong className="ps-file-name">{s.file_name}</strong>
                    {s.message && <div className="ps-file-note">Note: {s.message}</div>}
                  </td>
                  <td className="ps-col-shared">
                    <span className="ps-shared-name">{s.shared_by}</span>
                    <span className="ps-muted ps-shared-email">{s.shared_by_email}</span>
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
                    {s.expires_at ? new Date(s.expires_at).toLocaleString() : '—'}
                  </td>
                  <td className="ps-col-status">
                    <span className={`status-pill ${s.access_status === 'accessible' ? 'active' : 'inactive'}`}>
                      {s.access_status === 'accessible' ? 'Accessible' : (s.access_status ? s.access_status.charAt(0).toUpperCase() + s.access_status.slice(1) : 'Unknown')}
                    </span>
                  </td>
                  <td className="ps-col-actions">
                    <div className="ps-actions-toolbar">
                      {s.access_status === 'accessible' ? (
                        <>
                          {s.requires_password && (
                            <span className="ps-lock-badge" title="Password protected">
                              <Lock size={14} />
                            </span>
                          )}
                          {s.can_download && (
                            <button type="button" className="ps-btn" onClick={() => handleDownload(s)} title="Download">
                              <Download size={16} />
                            </button>
                          )}
                          {s.can_reshare && (
                            <button type="button" className="ps-btn" onClick={() => setReshareShare(s)} title="Re-share">
                              <Share2 size={16} />
                            </button>
                          )}
                          {s.can_comment && (
                            <button type="button" className="ps-btn" onClick={() => openComments(s.share_id)} title="Comments">
                              <MessageSquare size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="ps-btn ps-btn-views"
                            onClick={s.can_view ? () => handlePreview(s) : undefined}
                            disabled={!s.can_view}
                            title={s.can_view ? 'Preview' : `Views: ${s.view_count ?? 0}`}
                          >
                            <Eye size={16} />
                            <span className="ps-view-count">{s.view_count ?? 0}</span>
                          </button>
                        </>
                      ) : (
                        <span className="ps-muted">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {passwordPrompt && (
        <div className="modal-overlay" onClick={() => { setPasswordPrompt(null); setPassword(''); setShowPassword(false); }}>
          <div className="ps-password-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Enter share password</h3>
            <div className="ps-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="modal-input"
                placeholder="••••••••"
                autoComplete="new-password"
                name="private-share-access-password"
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
            <button type="button" className="share-submit-btn" style={{ marginTop: '12px' }} onClick={() => { 
                if (passwordPrompt.action === 'download') {
                  handleDownload(passwordPrompt.share, password); 
                } else {
                  handlePreview(passwordPrompt.share, password);
                }
                setPasswordPrompt(null); 
                setPassword('');
                setShowPassword(false);
            }}>
              Submit
            </button>
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
            <textarea className="modal-textarea" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." />
            <button type="button" className="share-submit-btn" onClick={submitComment}>Post</button>
          </div>
        </div>
      )}

      {previewFile && (
        <div className="modal-overlay" onClick={() => { URL.revokeObjectURL(previewFile.url); setPreviewFile(null); }}>
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
          onSuccess={() => load()}
        />
      )}
    </div>
  );
}
