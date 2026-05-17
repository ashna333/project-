import React, { useEffect, useState } from 'react';
import { Inbox, Download, Eye, Lock, MessageSquare } from 'lucide-react';
import {
  fetchPrivateSharesInboxApi,
  downloadPrivateShareApi,
  fetchPrivateShareCommentsApi,
  postPrivateShareCommentApi,
} from '../store/fileApi';
import '../styles/PrivateSharePages.css';

export default function SharedWithMePage() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwordPrompt, setPasswordPrompt] = useState(null);
  const [password, setPassword] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

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
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = share.file_name;
      link.click();
      window.URL.revokeObjectURL(url);
      load();
    } catch (err) {
      if (err.response?.status === 403 && share.requires_password) {
        setPasswordPrompt(share);
      } else {
        alert(err.response?.data?.error || 'Download failed.');
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
    openComments(commentsOpen);
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
            <thead>
              <tr>
                <th>File</th>
                <th>Shared by</th>
                <th>Permissions</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shares.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.file_name}</strong></td>
                  <td>{s.shared_by}<br /><span className="ps-muted">{s.shared_by_email}</span></td>
                  <td className="perm-badges">
                    {s.can_view && <span>View</span>}
                    {s.can_download && <span>Download</span>}
                    {s.can_reshare && <span>Re-share</span>}
                    {s.can_comment && <span>Comment</span>}
                  </td>
                  <td>{s.expires_at ? new Date(s.expires_at).toLocaleString() : '—'}</td>
                  <td>
                    <span className={`status-pill ${s.access_status === 'accessible' ? 'active' : 'inactive'}`}>
                      {s.access_status === 'accessible' ? 'Accessible' : s.access_status}
                    </span>
                  </td>
                  <td className="ps-actions">
                    {s.requires_password && <Lock size={14} title="Password protected" />}
                    {s.can_download && (
                      <button type="button" className="ps-btn" onClick={() => handleDownload(s)} title="Download">
                        <Download size={16} />
                      </button>
                    )}
                    {s.can_comment && (
                      <button type="button" className="ps-btn" onClick={() => openComments(s.share_id)} title="Comments">
                        <MessageSquare size={16} />
                      </button>
                    )}
                    <button type="button" className="ps-btn" title="Views"><Eye size={16} /> {s.view_count}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {passwordPrompt && (
        <div className="modal-overlay" onClick={() => setPasswordPrompt(null)}>
          <div className="ps-password-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Enter share password</h3>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="modal-input" />
            <button type="button" className="share-submit-btn" onClick={() => { handleDownload(passwordPrompt, password); setPasswordPrompt(null); }}>
              Download
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
    </div>
  );
}
