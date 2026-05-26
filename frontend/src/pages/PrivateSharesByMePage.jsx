import React, { useEffect, useState } from 'react';
import { Shield, Ban, BarChart2, Users, MessageSquare, Network ,X} from 'lucide-react';
import {
  fetchPrivateSharesOwnedApi,
  revokePrivateShareApi,
  fetchPrivateShareAuditApi,
  fetchPrivateShareCommentsApi,
  postPrivateShareCommentApi,
} from '../store/fileApi';
import ShareTreeModal from '../components/ShareTreeModal';
import Pagination from '../components/Pagination';
import '../styles/PrivateSharePages.css';
import ConfirmModal from '../components/ConfirmModal';


export default function PrivateSharesByMePage() {
  const [shares, setShares] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [treeOpen, setTreeOpen] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const pageSize = 9;

const load = async (page, currentFilter) => {
  setLoading(true);
  try {
    const { data } = await fetchPrivateSharesOwnedApi(page, currentFilter ?? filter, pageSize);
    const list = data.results?.shares ?? data.shares ?? (Array.isArray(data.results) ? data.results : []);
    const totalCount = data.count || 0;
    setTotalPages(Math.ceil(totalCount / pageSize) || 1);
    setShares(list);
  } catch {
    setShares([]);
  } finally {
    setLoading(false);
  }
};

const handlePageChange = (newPage) => {
  setCurrentPage(newPage);
  load(newPage, filter);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

useEffect(() => {
  setCurrentPage(1);
  load(1, filter);
}, [filter]);

 const revoke = async () => {
  if (!revokeTarget) return;
  try {
    await revokePrivateShareApi(revokeTarget);
    load(currentPage, filter);
  } catch (err) {
    console.error('Failed to revoke', err);
  } finally {
    setRevokeTarget(null);
  }
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
  const getAuditDotColor = (action) => {
  if (!action) return '#3f3f46';
  const a = action.toLowerCase();
  if (a.includes('download')) return '#e11d48';
  if (a.includes('preview') || a.includes('view')) return '#9333ea';
  if (a.includes('revoke')) return '#7f1d1d';
  if (a === 'shared' || a.includes('create')) return '#99103e';
  if (a.includes('re-share') || a.includes('reshare')) return '#0891b2';
  if (a.includes('comment')) return '#d97706';
  return '#3f3f46';
};

const getAuditActionColor = (action) => {
  if (!action) return '#a1a1aa';
  const a = action.toLowerCase();
  if (a.includes('download')) return '#fda4af';
  if (a.includes('preview') || a.includes('view')) return '#c084fc';
  if (a.includes('revoke')) return '#df2030';
  if (a === 'shared' || a.includes('create')) return '#be545d';
  if (a.includes('re-share') || a.includes('reshare')) return '#67e8f9';
  if (a.includes('comment')) return '#fcd34d';
  return '#a1a1aa';
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
          <button
            key={f}
            type="button"
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter((prevFilter) => (prevFilter === f ? '' : f))}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="ps-muted">Loading...</p>
      ) : shares.length === 0 ? (
        <div className="ps-empty">No {filter ? `${filter} ` : ''}private shares.</div>
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
                
                  <button type="button" className="ps-btn-text" onClick={() => openComments(s.id)}>
                    <MessageSquare size={14} style={{ marginRight: '4px' }} /> Comments
                  </button>
                
                {!s.is_revoked && !s.is_expired && (
                  <button type="button" className="ps-btn-revoke" onClick={() => setRevokeTarget(s.id)}>
                    <Ban size={14} /> Revoke
                  </button>
                )}
        </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        loading={loading}
      />

    {auditLogs && (
  <div className="modal-overlay" onClick={() => setAuditLogs(null)}>
    <div className="ps-audit-modal" onClick={(e) => e.stopPropagation()}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>Audit Log</h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>
            {auditLogs.logs.length} event{auditLogs.logs.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button
          type="button"
          className="close-x-btn"
          onClick={() => setAuditLogs(null)}
        >
          <X size={18} />
        </button>
      </div>

      {/* Log list */}
      <div className="audit-list">
        {auditLogs.logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#52525b' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>No activity recorded yet.</p>
          </div>
        ) : (
          auditLogs.logs.map((log, index) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 0',
                borderBottom: index < auditLogs.logs.length - 1 ? '1px solid #27272a' : 'none',
              }}
            >
              {/* Action dot */}
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: getAuditDotColor(log.action),
                marginTop: '6px', flexShrink: 0,
              }} />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 600,
                    color: getAuditActionColor(log.action),
                    textTransform: 'capitalize',
                  }}>
                    {log.action_label || log.action}
                  </span>
                 <span style={{ fontSize: '11px', color: '#71717a', flexShrink: 0 }}>
                    {new Date(log.created_at).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#a1a1aa' }}>
                  {log.actor_name || '—'}
                  {log.actor_email && log.actor_name && (
                    <span style={{ color: '#747480', marginLeft: '6px' }}>· {log.actor_email}</span>
                  )}
                </p>
              </div>
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
      <br />
      <div className="comments-list">
        {(comments.length === 0)? (
          <p className="comments-empty">No comments yet.</p>
         ) : (
          comments.map((c) => (
            <div key={c.id} className="comment-item">
              <strong>{c.author_name}</strong>
              <p>{c.content}</p>
              {c.highlight_text && <em>Highlight: {c.highlight_text}</em>}
          </div>
        )))}
      </div>
         
      
      {(() => {
        const share = shares.find((s) => s.id === commentsOpen);
        const canPost = !share?.is_revoked && !share?.is_expired;
        return canPost ? (
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
        ) : (
          <></>
        );
      })()}
    </div>
  </div>
)}
<ConfirmModal
  open={!!revokeTarget}
  title="Revoke this share?"
  message="This will revoke access for all recipients of this share."
  confirmLabel="Revoke"
  onConfirm={revoke}
  onCancel={() => setRevokeTarget(null)}
/>

      <ShareTreeModal
        shareId={treeOpen}
        isOpen={!!treeOpen}
        onClose={() => setTreeOpen(null)}
        onRefresh={() => load()}
      />
    </div>
  );
}