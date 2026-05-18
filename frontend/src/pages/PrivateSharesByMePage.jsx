import React, { useEffect, useState } from 'react';
import { Shield, Ban, BarChart2, Users, MessageSquare, Network } from 'lucide-react';
import {
  fetchPrivateSharesOwnedApi,
  revokePrivateShareApi,
  fetchPrivateShareAuditApi,
  fetchPrivateShareCommentsApi,
  postPrivateShareCommentApi,
} from '../store/fileApi';
import ShareTreeModal from '../components/ShareTreeModal';
import '../styles/PrivateSharePages.css';

export default function PrivateSharesByMePage() {
  const [shares, setShares] = useState([]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [treeOpen, setTreeOpen] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await fetchPrivateSharesOwnedApi(1, filter);
      const list = data.results?.shares ?? data.shares ?? (Array.isArray(data.results) ? data.results : []);
      setShares(list);
    } catch {
      setShares([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const revoke = async (id) => {
    if (!window.confirm('Revoke this private share for all recipients?')) return;
    await revokePrivateShareApi(id);
    load();
  };

  const viewAudit = async (id) => {
    const { data } = await fetchPrivateShareAuditApi(id);
    setAuditLogs({ id, logs: data });
  };

  const openComments = async (shareId) => {
    setCommentsOpen(shareId);
    try {
      const { data } = await fetchPrivateShareCommentsApi(shareId);
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments', error);
      setComments([]);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    try {
      await postPrivateShareCommentApi(commentsOpen, { content: newComment });
      setNewComment('');
      setCommentsOpen(null);
    } catch (error) {
      console.error('Failed to post comment', error);
    }
  };

  return (
    <div className="private-share-page fade-in">
      <div className="ps-header">
        <Shield size={28} className="rose-text" />
        <div>
          <h1>Shared By Me</h1>
          <p>Private shares you created — analytics & revocation</p>
        </div>
      </div>

      <div className="ps-filters">
        {['active', 'expired', 'revoked'].map((f) => (
          <button key={f} type="button" className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="ps-muted">Loading...</p>
      ) : shares.length === 0 ? (
        <div className="ps-empty">No {filter} private shares.</div>
      ) : (
        <div className="ps-cards">
          {shares.map((s) => (
            <div key={s.id} className="ps-card">
              <div className="ps-card-top">
                <h3 title={s.file_name}>{s.file_name}</h3>
                <span className={`status-pill ${s.is_revoked ? 'inactive' : s.is_expired ? 'inactive' : 'active'}`}>
                  {s.is_revoked ? 'Revoked' : s.is_expired ? 'Expired' : 'Active'}
                </span>
              </div>
              {s.analytics && (
                <div className="ps-analytics">
                  <span><Users size={14} /> {s.analytics.unique_viewers} viewers</span>
                  <span><BarChart2 size={14} /> {s.analytics.total_downloads} downloads</span>
                  {s.analytics.last_accessed && <span>Last: {new Date(s.analytics.last_accessed).toLocaleString()}</span>}
                </div>
              )}
              <div className="recipients-list">
                {s.recipients?.map((r) => (
                  <span key={r.id} className="recipient-chip">{r.recipient_email}</span>
                ))}
              </div>
              <div className="ps-card-actions">
                <button type="button" className="ps-btn-text" onClick={() => setTreeOpen(s.id)}>
                  <Network size={14} style={{ marginRight: '4px' }} /> Tree
                </button>
                <button type="button" className="ps-btn-text" onClick={() => viewAudit(s.id)}>Audit log</button>
                {!s.is_revoked && (
                  <button type="button" className="ps-btn-text" onClick={() => openComments(s.id)}>
                    <MessageSquare size={14} style={{ marginRight: '4px' }} /> Comments
                  </button>
                )}
                {!s.is_revoked && (
                  <button type="button" className="ps-btn-revoke" onClick={() => revoke(s.id)}>
                    <Ban size={14} /> Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {auditLogs && (
        <div className="modal-overlay" onClick={() => setAuditLogs(null)}>
          <div className="ps-audit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Audit log (permanent)</h3>
            <div className="audit-list">
              {auditLogs.logs.length === 0 ? (
                <p className="audit-empty">No activity recorded yet for this file.</p>
              ) : (
                auditLogs.logs.map((log) => (
                  <div key={log.id} className="audit-row">
                    <span className="audit-action">{log.action_label || log.action}</span>
                    <span>
                      {log.actor_name || log.actor_email || '—'}
                      {log.actor_email && log.actor_name && (
                        <span className="audit-meta">{log.actor_email}</span>
                      )}
                    </span>
                    <span className="ps-muted">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                ))
              )}
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
            {!shares.find((s) => s.id === commentsOpen)?.is_revoked && (
              <>
                <textarea className="modal-textarea" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." />
                <button type="button" className="share-submit-btn" onClick={submitComment}>Post</button>
              </>
            )}
          </div>
        </div>
      )}

      <ShareTreeModal
        shareId={treeOpen}
        isOpen={!!treeOpen}
        onClose={() => setTreeOpen(null)}
        onRefresh={() => load()}
      />
    </div>
  );
}
